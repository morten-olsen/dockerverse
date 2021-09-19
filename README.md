# Dockerverse

This is my upcoming docker orchestrator - think docker-compose+ but still under development

## Differences from `docker-compose`

**Multi-docker focused**
I have a few docker based application servers as well as a lot of docker based raspberry pis, and I want one platform to manage them all

**Infrastructure as code**
Each "compose" is a JavaScript class, which can do setup dynamically based on environments or other dynamic values

**Inter-compose focused**
One "compose" file does not live in isolation, but can expose APIs for other "compose" files to use. For instance a `traefik` "compose" file can expose an API with a `addToLoadblancer(container, domain)` function, that other "compose" files can use to add the correct labels and networks to a container

## Examples

...Are coming, but look at `src/index.ts` and `src/buildins/proxy/project.ts` for an initial idea
