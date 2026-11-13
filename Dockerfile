# Imagem pequena e sem dependências: compila um único binário estático.
FROM golang:1.24 AS build
WORKDIR /src
COPY go.mod ./
COPY . .
ARG APP_VERSION=local
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=${APP_VERSION}" -o /out/server ./cmd/server

# distroless: sem shell, com certificados HTTPS, roda como usuário comum
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/server"]
