import { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ImageLibrary({ onSelectImage, selectedImage }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/imageLibrary');
      if (!res.ok) throw new Error('Failed to load images');
      setImages(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const idx = images.findIndex(img => img.name === selectedImage);

  const selectPrev = () => idx > 0 && onSelectImage(images[idx - 1].name);
  const selectNext = () => idx < images.length - 1 && onSelectImage(images[idx + 1].name);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">Images</CardTitle>
        <Button size="sm" variant="outline" onClick={loadImages} className="mt-2 w-full text-xs h-8">
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col overflow-hidden p-2">
        {loading && <div className="text-xs text-gray-500 text-center my-auto">Loading...</div>}
        {error && <div className="text-xs text-red-600 text-center my-auto">{error}</div>}
        {!loading && !images.length && <div className="text-xs text-gray-400 text-center my-auto">No images</div>}

        {!loading && images.length > 0 && (
          <>
            <ScrollArea className="flex-grow">
              <div className="space-y-1 pr-2">
                {images.map(img => (
                  <button
                    key={img.name}
                    onClick={() => onSelectImage(img.name)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors ${
                      selectedImage === img.name
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="truncate font-medium">{img.name}</div>
                    {img.metadata && <div className="opacity-75 text-xs">{img.metadata.width}×{img.metadata.height}</div>}
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-1 mt-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={selectPrev} disabled={idx <= 0} className="flex-1 h-8">
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={selectNext} disabled={idx >= images.length - 1} className="flex-1 h-8">
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
            {idx >= 0 && <div className="text-xs text-gray-500 text-center mt-1">{idx + 1}/{images.length}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
