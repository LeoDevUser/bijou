package com.bijou.backend.services;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.exception.AppException;

import lombok.extern.slf4j.Slf4j;

/**
 * Shrinks oversized hero/editorial videos with ffmpeg before they reach Cloudinary.
 *
 * Two ceilings make this necessary: Cloudinary caps the uploaded video itself, and
 * caps the source size it is willing to transform — which is the lower of the two.
 * Every video is delivered through a q_auto,vc_h264 transformation (see the
 * frontend's optimizedVideoUrl), so a source past the transform ceiling uploads
 * fine and then renders as an empty slot on the live site.
 */
@Service
@Slf4j
public class VideoTranscodeService {

    /**
     * Quality ladder, tried in order until the output fits. It starts close to
     * visually lossless and gives ground reluctantly: what we produce is the stored
     * master, and Cloudinary re-encodes it again for delivery, so every bit of
     * quality dropped here is paid for twice.
     */
    private record Pass(int crf, int width) {}

    private static final List<Pass> PASSES =
            List.of(new Pass(18, 1920), new Pass(23, 1920), new Pass(28, 1440));

    /** Kept for the error message when ffmpeg fails — the full log is far too noisy. */
    private static final int LOG_TAIL_LINES = 10;

    @Value("${video.transcode.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    /** Bounded because the HTTP request is held open for the whole transcode. */
    @Value("${video.transcode.timeout-seconds:300}")
    private long timeoutSeconds;

    /**
     * Returns a file at or under {@code targetBytes}, re-encoding only when the
     * source is already too big — an in-budget video is passed through untouched
     * rather than losing a generation of quality for nothing.
     *
     * @return the source itself when no work was needed, otherwise a new temp file
     *         the caller owns and must delete.
     */
    public Path compressToUnder(Path source, long targetBytes) throws IOException {
        long sourceBytes = Files.size(source);
        if (sourceBytes <= targetBytes) return source;

        log.info("video is {}MB, over the {}MB ceiling — compressing", sourceBytes >> 20, targetBytes >> 20);
        Path smallest = null;
        for (Pass pass : PASSES) {
            Path out = Files.createTempFile("bijou-transcode-", ".mp4");
            try {
                run(source, out, pass);
            } catch (RuntimeException | IOException e) {
                deleteQuietly(out);
                deleteQuietly(smallest);
                throw e;
            }
            long outBytes = Files.size(out);
            log.info("compressed to {}MB at crf {} / {}px", outBytes >> 20, pass.crf(), pass.width());
            if (outBytes <= targetBytes) {
                deleteQuietly(smallest);
                return out;
            }
            // Keep the newest attempt only; the ladder is monotonically smaller.
            deleteQuietly(smallest);
            smallest = out;
        }
        deleteQuietly(smallest);
        log.warn("video still over {}MB after the full quality ladder", targetBytes >> 20);
        throw new AppException(HttpStatus.BAD_REQUEST, "VIDEO_COMPRESSION_INSUFFICIENT");
    }

    private void run(Path in, Path out, Pass pass) throws IOException {
        List<String> cmd = new ArrayList<>(List.of(
                ffmpegPath, "-y", "-hide_banner", "-loglevel", "error",
                "-i", in.toString(),
                "-c:v", "libx264",
                "-crf", String.valueOf(pass.crf()),
                "-preset", "veryfast",
                // Never upscale — min() leaves an already-smaller video at its own
                // width; -2 keeps the aspect ratio on an even height, which H.264 needs.
                "-vf", "scale='min(" + pass.width() + ",iw)':-2",
                "-pix_fmt", "yuv420p",
                // Moves the index to the front so the browser can start playing
                // before the whole file has arrived.
                "-movflags", "+faststart",
                // Every slot renders muted, so the audio track is pure weight.
                "-an",
                out.toString()));

        Process proc;
        try {
            proc = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        } catch (IOException e) {
            log.error("could not start ffmpeg at '{}': {}", ffmpegPath, e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "VIDEO_COMPRESSION_UNAVAILABLE");
        }

        // Drained as it is produced: ffmpeg blocks once the pipe buffer fills, which
        // would deadlock against our own waitFor below.
        Deque<String> tail = new ArrayDeque<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (tail.size() == LOG_TAIL_LINES) tail.removeFirst();
                tail.addLast(line);
            }
        }

        try {
            if (!proc.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
                proc.destroyForcibly();
                log.error("ffmpeg exceeded the {}s budget", timeoutSeconds);
                throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "VIDEO_COMPRESSION_TIMEOUT");
            }
        } catch (InterruptedException e) {
            proc.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "VIDEO_COMPRESSION_FAILED");
        }

        if (proc.exitValue() != 0) {
            log.error("ffmpeg exited {}: {}", proc.exitValue(), String.join(" | ", tail));
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "VIDEO_COMPRESSION_FAILED");
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("could not delete temp file {}: {}", path, e.getMessage());
        }
    }
}
