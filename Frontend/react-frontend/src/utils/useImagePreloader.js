import { useState, useEffect } from "react";

const useImagePreloader = (src, fallback) => {
    const [imageSrc, setImageSrc] = useState(src);

    useEffect(() => {
        const img = new Image();
        img.src = src;

        img.onload = () => setImageSrc(src); // Si se carga correctamente
        img.onerror = () => setImageSrc(fallback); // Si ocurre un error al cargar

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, fallback]);

    return imageSrc;
};

export default useImagePreloader;
