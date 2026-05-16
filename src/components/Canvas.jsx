import { useEffect, useRef } from "react";

const MAG_LENS_CSS = 60;
const MAG_ZOOM = 2.5;

function Canvas({ imgSrc, onPointsClicked, onImageLoaded, className }) {
  const canvasRef = useRef(null);
  const magnifierRef = useRef(null);
  const containerRef = useRef(null);
  const pointsClickedRef = useRef(onPointsClicked);
  pointsClickedRef.current = onPointsClicked;

  useEffect(() => {
    const canvas = canvasRef.current;
    const magCanvas = magnifierRef.current;
    const container = containerRef.current;
    if (!canvas || !magCanvas || !container) return;

    const ctx = canvas.getContext("2d");
    const magCtx = magCanvas.getContext("2d");
    magCanvas.width = MAG_LENS_CSS;
    magCanvas.height = MAG_LENS_CSS;

    const image = new Image();
    let bitmapReady = false;

    const clientToBitmap = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const positionLens = (clientX, clientY) => {
      const wrap = container.getBoundingClientRect();
      const pad = 12;
      let left = clientX - wrap.left + pad;
      let top = clientY - wrap.top - MAG_LENS_CSS - pad;
      left = Math.min(Math.max(0, left), Math.max(0, wrap.width - MAG_LENS_CSS));
      top = Math.min(Math.max(0, top), Math.max(0, wrap.height - MAG_LENS_CSS));
      magCanvas.style.left = `${left}px`;
      magCanvas.style.top = `${top}px`;
    };

    const drawMagnifier = (clientX, clientY) => {
      if (!bitmapReady || canvas.width <= 0 || canvas.height <= 0) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const { x: bx, y: by } = clientToBitmap(clientX, clientY);
      let srcW = (MAG_LENS_CSS / MAG_ZOOM) * (canvas.width / rect.width);
      let srcH = (MAG_LENS_CSS / MAG_ZOOM) * (canvas.height / rect.height);
      srcW = Math.min(srcW, canvas.width);
      srcH = Math.min(srcH, canvas.height);
      let sx = bx - srcW / 2;
      let sy = by - srcH / 2;
      sx = Math.max(0, Math.min(sx, canvas.width - srcW));
      sy = Math.max(0, Math.min(sy, canvas.height - srcH));
      magCtx.clearRect(0, 0, MAG_LENS_CSS, MAG_LENS_CSS);
      magCtx.drawImage(canvas, sx, sy, srcW, srcH, 0, 0, MAG_LENS_CSS, MAG_LENS_CSS);
      const cx = MAG_LENS_CSS / 2;
      const cy = MAG_LENS_CSS / 2;
      const arm = (MAG_LENS_CSS / 2) / 10;
      magCtx.save();
      magCtx.strokeStyle = "red";
      magCtx.lineWidth = 1.5;
      magCtx.lineCap = "square";
      magCtx.beginPath();
      magCtx.moveTo(cx - arm, cy);
      magCtx.lineTo(cx + arm, cy);
      magCtx.moveTo(cx, cy - arm);
      magCtx.lineTo(cx, cy + arm);
      magCtx.stroke();
      magCtx.restore();
    };

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      bitmapReady = true;
      onImageLoaded?.();
    };
    image.src = imgSrc;

    const construct_canvas = (event) => {
      if (!bitmapReady) return;
      const { x, y } = clientToBitmap(event.clientX, event.clientY);
      const rx = Math.round(x);
      const ry = Math.round(y);
      pointsClickedRef.current({ x: rx, y: ry });
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    const onMove = (event) => {
      if (!bitmapReady) return;
      positionLens(event.clientX, event.clientY);
      drawMagnifier(event.clientX, event.clientY);
      magCanvas.style.visibility = "visible";
    };

    const onLeave = () => {
      magCanvas.style.visibility = "hidden";
    };

    canvas.addEventListener("click", construct_canvas);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      bitmapReady = false;
      canvas.removeEventListener("click", construct_canvas);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [imgSrc]);

  return (
    <div ref={containerRef} className="relative inline-block max-w-full max-h-full">
      <canvas ref={canvasRef} className={className} />
      <canvas
        ref={magnifierRef}
        width={MAG_LENS_CSS}
        height={MAG_LENS_CSS}
        className="absolute pointer-events-none rounded-full border-2 border-neutral-200 shadow-xl bg-neutral-900 ring-1 ring-black/20"
        style={{
          width: MAG_LENS_CSS,
          height: MAG_LENS_CSS,
          left: 0,
          top: 0,
          visibility: "hidden",
        }}
      />
    </div>
  );
}

export default Canvas
