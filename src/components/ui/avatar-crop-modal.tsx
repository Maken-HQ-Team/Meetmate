import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCw, Download } from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

export const AvatarCropModal = ({ isOpen, onClose, imageFile, onCropComplete }: AvatarCropModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Reset state when modal opens with new image
  React.useEffect(() => {
    if (isOpen && imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      setImageLoaded(false);
      setZoom([1]);
      setRotation(0);
      setPosition({ x: 0, y: 0 });

      // Cleanup previous URL
      return () => {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      };
    }
  }, [isOpen, imageFile]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageLoaded) {
      console.log('Canvas draw skipped:', { canvas: !!canvas, image: !!image, imageLoaded });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300; // Canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context
    ctx.save();

    // Move to center
    ctx.translate(size / 2, size / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate scaled dimensions
    const scale = zoom[0];
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    // Draw image with position offset
    ctx.drawImage(
      image,
      -scaledWidth / 2 + position.x,
      -scaledHeight / 2 + position.y,
      scaledWidth,
      scaledHeight
    );

    // Restore context
    ctx.restore();

    // Create circular mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    console.log('Canvas drawn successfully');
  }, [zoom, rotation, position, imageLoaded]);

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas for cropping');
      return;
    }

    console.log('Creating blob from canvas');
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('Blob created successfully:', blob.size, 'bytes');
        onCropComplete(blob);
        // Clean up
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
        onClose();
      } else {
        console.error('Failed to create blob from canvas');
      }
    }, 'image/png', 1);
  };

  // Update canvas when transformations change
  React.useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [drawCanvas, imageLoaded]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crop className="h-5 w-5" />
            <span>Crop Avatar</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden image for loading */}
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              onLoad={handleImageLoad}
              onError={(e) => {
                console.error('Image failed to load:', e);
              }}
              className="hidden"
              alt="Source"
              crossOrigin="anonymous"
            />
          )}

          {/* Preview image (visible) */}
          {imageUrl && !imageLoaded && (
            <div className="flex justify-center mb-4">
              <div className="w-[300px] h-[300px] border-2 border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">Loading image...</span>
              </div>
            </div>
          )}

          {/* Canvas for cropping */}
          {imageLoaded && (
            <div className="flex justify-center">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-full cursor-move"
                  width={300}
                  height={300}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            </div>
          )}

          {/* Controls */}
          {imageLoaded && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Zoom: {zoom[0].toFixed(1)}x</label>
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={0.1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Rotate 90°
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Drag to reposition, use zoom slider to resize
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!imageLoaded}>
            <Download className="h-4 w-4 mr-2" />
            Use This Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};