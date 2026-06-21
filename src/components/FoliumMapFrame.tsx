import { useState } from "react";

export function FoliumMapFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden rounded-sm border border-border bg-card">
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <span className="mx-auto block size-5 animate-pulse rounded-full bg-primary/30" />
            <p className="mt-3 text-xs text-muted-foreground">Loading thesis map…</p>
          </div>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`block h-[640px] w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
