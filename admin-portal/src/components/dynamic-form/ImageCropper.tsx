'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';

interface ImageCropperProps {
  file: File;
  targetWidth: number;
  targetHeight: number;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  file,
  targetWidth,
  targetHeight,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const handleCropAreaComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx || !croppedAreaPixels) return;

      // Calculate crop coordinates
      const { x, y, width, height } = croppedAreaPixels;

      // Draw cropped and resized image
      ctx.drawImage(
        imageBitmap,
        x, y, width, height,
        0, 0,
        targetWidth, targetHeight
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, 'image/jpeg', 0.85);
    } catch (error) {
      console.error('Crop failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
          <h3 className="text-lg font-semibold text-[#1C1917]">
            Crop Image to {targetWidth} × {targetHeight}px
          </h3>
          <button onClick={onCancel} className="text-[#A8A29E] hover:text-[#1C1917]">
            <X size={20} />
          </button>
        </div>

        <div className="relative h-64 bg-black">
          <Cropper
            image={URL.createObjectURL(file)}
            crop={crop}
            zoom={zoom}
            aspect={targetWidth / targetHeight}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropAreaComplete}
          />
        </div>

        <div className="p-4">
          <label className="block text-sm font-medium text-[#1C1917] mb-2">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-3 p-4 border-t border-[#E7E5E4]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-[#E7E5E4] rounded-lg text-[#1C1917] hover:bg-[#FAFAF8]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B8963C]"
          >
            Crop & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
