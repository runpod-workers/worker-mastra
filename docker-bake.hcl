variable "DOCKERHUB_REPO" {
  default = "runpod"
}

variable "DOCKERHUB_IMG" {
  default = "worker-mastra"
}

variable "RELEASE_VERSION" {
  default = "latest"
}

group "default" {
  targets = ["worker-mastra"]
}

target "worker-mastra" {
  tags = ["${DOCKERHUB_REPO}/${DOCKERHUB_IMG}:${RELEASE_VERSION}"]
  context = "."
  dockerfile = "Dockerfile"
  platforms = ["linux/amd64"]
}
