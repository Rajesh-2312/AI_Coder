import React from 'react';

interface WelcomeMessageProps {
  onGetStarted?: () => void;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onGetStarted }) => {
  return (
    <div className="welcome-message">
      <div className="welcome-content">
        <div className="welcome-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>Welcome to AI-Coder!</h2>
        <p>Your AI-powered development environment is ready.</p>
        <div className="welcome-features">
          <div className="feature">
            <span className="feature-icon">🤖</span>
            <span>AI Assistant for code generation and analysis</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📁</span>
            <span>File explorer and project management</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💻</span>
            <span>Integrated terminal for command execution</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Real-time collaboration and streaming</span>
          </div>
        </div>
        <div className="welcome-actions">
          <button className="btn-primary" onClick={onGetStarted}>
            Get Started
          </button>
          <button className="btn-secondary" onClick={() => window.open('https://github.com/your-repo', '_blank')}>
            View Documentation
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .welcome-message {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100%;
          padding: 2rem;
          background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
        }
        
        .welcome-content {
          text-align: center;
          max-width: 600px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 3rem 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .welcome-icon {
          margin-bottom: 1.5rem;
          color: #4f46e5;
        }
        
        .welcome-content h2 {
          color: #ffffff;
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .welcome-content p {
          color: #a1a1aa;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }
        
        .welcome-features {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
          text-align: left;
        }
        
        .feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #e4e4e7;
          font-size: 0.95rem;
        }
        
        .feature-icon {
          font-size: 1.25rem;
          min-width: 1.5rem;
        }
        
        .welcome-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn-primary, .btn-secondary {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .btn-primary {
          background: #4f46e5;
          color: white;
        }
        
        .btn-primary:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          background: transparent;
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }
        
        @media (max-width: 768px) {
          .welcome-content {
            padding: 2rem 1rem;
          }
          
          .welcome-features {
            grid-template-columns: 1fr;
          }
          
          .welcome-actions {
            flex-direction: column;
            align-items: center;
          }
          
          .btn-primary, .btn-secondary {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
};
