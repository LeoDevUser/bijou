# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and pom first so dependency downloads are cached
# as a separate layer — only re-downloaded when pom.xml changes.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B -q

# Build the jar (skip tests — run them in CI before building the image)
COPY src ./src
RUN ./mvnw package -DskipTests -B -q

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Oversized hero/editorial videos are re-encoded here before they go to Cloudinary
# (VideoTranscodeService) — Cloudinary refuses to transform a large source, and
# every video is delivered through a transformation.
RUN apk add --no-cache ffmpeg

# Non-root user for security
RUN addgroup -S bijou && adduser -S bijou -G bijou

COPY --from=build /app/target/*.jar app.jar

USER bijou
EXPOSE 8080

# UseContainerSupport  — makes the JVM respect cgroup memory limits
# MaxRAMPercentage=75  — lets the JVM use up to 75% of the container RAM
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
