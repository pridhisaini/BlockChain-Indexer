import { useState, useRef, useEffect } from 'react';
import './VideoBackground.css';

const VideoBackground = () => {
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        // Attempt to play video when component mounts
        if (videoRef.current) {
            videoRef.current.play().catch(error => {
                console.log("Video autoplay failed or blocked:", error);
                // If autoplay is blocked or fails, we might want to show fallback
                // But usually 'error' event handles missing files. 
                // Autoplay block is different.
            });
        }
    }, []);

    const handleError = () => {
        console.log("Background video failed to load, switching to fallback.");
        setVideoError(true);
    };

    if (videoError) {
        return (
            <div className="animated-bg-fallback">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="orb orb-4"></div>
                <div className="orb orb-5"></div>
            </div>
        );
    }

    return (
        <div className="video-background-container">
            <video
                ref={videoRef}
                className="video-background"
                autoPlay
                loop
                muted
                playsInline
                onError={handleError}
            >
                <source src="/background.mp4" type="video/mp4" />
                {/* Add more formats if needed, e.g. webm */}
            </video>
            {/* Overlay to ensure text readability */}
            <div className="video-overlay"></div>
        </div>
    );
};

export default VideoBackground;
