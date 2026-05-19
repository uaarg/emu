import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Canvas from './Canvas';

export default function RGBDViewer({ imageName, onPointsClicked, loading = false }) {
  const [imgData, setImgData] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!imageName) {
      setImgUrl(null);
      setImgData(null);
      return;
    }
    
    (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/imageData/${encodeURIComponent(imageName)}`);
        if (!res.ok) throw new Error('Failed to load image');
        const data = await res.json();
        setImgData(data.metadata);
        setImgUrl(data.imageUrl);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [imageName]);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">{imageName || 'Select image'}</CardTitle>
        {imgData && <div className="text-xs text-gray-500 mt-1">{imgData.width}×{imgData.height}</div>}
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center overflow-hidden p-2">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && imgUrl && <Canvas imgSrc={imgUrl} onPointsClicked={(p) => onPointsClicked?.(p, imageName)} className="object-contain w-full h-full" />}
        {!loading && !imgUrl && !error && <div className="text-xs text-gray-400">No image</div>}
      </CardContent>
    </Card>
  );
}
