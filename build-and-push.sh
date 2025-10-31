#!/bin/bash
# Build and push Docker image locally to Docker Hub

set -e

# Configuration
DOCKERHUB_REPO="${DOCKERHUB_REPO:-runpod}"
DOCKERHUB_IMG="${DOCKERHUB_IMG:-worker-mastra}"
VERSION="${1:-latest}"

echo "🔨 Building Docker image: ${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${VERSION}"

# Build the image
docker build --platform linux/amd64 -t "${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${VERSION}" .

echo "✅ Build complete!"
echo ""
echo "📤 To push to Docker Hub, run:"
echo "   docker login"
echo "   docker push ${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${VERSION}"
echo ""
read -p "Push to Docker Hub now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Pushing to Docker Hub..."
    docker push "${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${VERSION}"
    echo "✅ Push complete!"
    echo ""
    echo "📦 Image available at: ${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${VERSION}"
fi

