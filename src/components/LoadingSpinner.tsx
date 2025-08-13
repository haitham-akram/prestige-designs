export default function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="loading-text">جاري تحميل المنتجات...</div>
      <div className="progress-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      <style jsx>{`
        .loading-spinner-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          background: var(--color-dark-primary);
          z-index: 9999;
        }

        .loading-text {
          font-size: 1.2rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-align: center;
          margin: 0;
        }

        .progress-dots {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          background-color: var(--color-purple-primary);
          border-radius: 50%;
          animation: dotPulse 1.5s ease-in-out infinite;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotPulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  )
}
