package app

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strings"
)

// ImageProcessor handles downloading, modifying, and preparing images to bypass copy prohibitions.
type ImageProcessor struct{}

func NewImageProcessor() *ImageProcessor {
	return &ImageProcessor{}
}

// ProcessImageDownloads downloads an image from a URL, applies a slight modification
// (e.g., adding a 2px white border and stripping EXIF) to change its hash and visual signature,
// and returns the modified image bytes.
func (ip *ImageProcessor) ProcessImage(imageURL string) ([]byte, error) {
	// 1. Download original image
	resp, err := http.Get(imageURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 2. Decode image
	img, format, err := image.Decode(resp.Body)
	if err != nil {
		return nil, err
	}

	// 3. Create a new image with a slight border (e.g., +4 pixels) to change hash and signature
	bounds := img.Bounds()
	newWidth := bounds.Dx() + 4
	newHeight := bounds.Dy() + 4
	newBounds := image.Rect(0, 0, newWidth, newHeight)

	rgba := image.NewRGBA(newBounds)
	
	// Fill with white background
	white := color.RGBA{255, 255, 255, 255}
	draw.Draw(rgba, newBounds, &image.Uniform{white}, image.Point{}, draw.Src)

	// Paste the original image in the center (offset by 2,2)
	offset := image.Pt(2, 2)
	draw.Draw(rgba, bounds.Add(offset), img, bounds.Min, draw.Over)

	// 4. Encode back to bytes (strips EXIF data automatically in Go's standard library)
	var buf bytes.Buffer
	if strings.ToLower(format) == "png" {
		err = png.Encode(&buf, rgba)
	} else {
		// Default to high-quality JPEG
		err = jpeg.Encode(&buf, rgba, &jpeg.Options{Quality: 95})
	}

	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// UploadToOSS is a placeholder for uploading the processed bytes to a public Object Storage (OSS).
// Ozon requires a public URL to import images.
func (ip *ImageProcessor) UploadToOSS(imageBytes []byte, filename string) (string, error) {
	// TODO: Implement Aliyun OSS / AWS S3 / Cloudflare R2 upload here.
	// Example return: "https://your-oss-bucket.com/processed-images/" + filename
	return "https://mock-oss.com/" + filename, nil
}
