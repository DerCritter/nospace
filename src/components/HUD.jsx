import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'

export default function HUD() {
  const activeArt = useStore((state) => state.activeArt)
  const setActiveArt = useStore((state) => state.setActiveArt)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    setCurrentImageIndex(0)
    if (!activeArt || !activeArt.images || activeArt.images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev < activeArt.images.length - 1 ? prev + 1 : 0))
    }, 3000)
    return () => clearInterval(interval)
  }, [activeArt])

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        justifyContent: activeArt ? 'flex-end' : 'center',
        alignItems: 'center',
        padding: '50px 10%',
        boxSizing: 'border-box'
      }}
    >
      {activeArt && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          color: '#000',
          padding: '50px 40px',
          borderRadius: '0px',
          width: '450px',
          pointerEvents: 'auto',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid #000',
          boxShadow: '15px 15px 0px rgba(204, 255, 0, 1)',
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
          opacity: activeArt ? 1 : 0,
          transform: activeArt ? 'translateX(0)' : 'translateX(100px)'
        }}>
          <div style={{ 
            fontFamily: '"Space Mono", monospace', 
            fontSize: '0.7em', 
            color: '#000', 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px',
            borderBottom: '1px solid #000',
            paddingBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>// ITEM_DATA</span>
            <span>SYS.ACTIVE</span>
          </div>

          <h1 style={{ 
            fontFamily: '"Playfair Display", serif', 
            margin: '0 0 10px 0', 
            fontSize: '2.8em', 
            fontWeight: '400', 
            fontStyle: 'italic',
            letterSpacing: '-1px',
            lineHeight: '1.1'
          }}>{activeArt.title}</h1>
          
          <h3 style={{ 
            fontFamily: '"Space Mono", monospace',
            margin: '0 0 24px 0', 
            fontSize: '0.85em', 
            color: '#000', 
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: '#ccff00',
            display: 'inline-block',
            padding: '2px 8px'
          }}>AUTHOR: {activeArt.artist}</h3>
          
          {activeArt.images && activeArt.images.length > 0 && (
            <div style={{ position: 'relative', marginBottom: '30px', border: '1px solid #000' }}>
              <img src={activeArt.images[currentImageIndex]} alt="Artwork" style={{ 
                width: '100%', 
                height: '250px', 
                objectFit: 'cover', 
                display: 'block',
                filter: 'grayscale(100%) contrast(120%)' 
              }} />
              
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: '#ccff00',
                color: '#000',
                padding: '2px 8px',
                fontFamily: '"Space Mono", monospace',
                fontSize: '0.8em',
                fontWeight: 'bold',
                border: '1px solid #000'
              }}>
                {currentImageIndex + 1} / {activeArt.images.length}
              </div>

              {activeArt.images.length > 1 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '10px', 
                  display: 'flex', 
                  gap: '5px' 
                }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : activeArt.images.length - 1));
                    }}
                    style={{ background: '#000', color: '#ccff00', border: '1px solid #ccff00', padding: '5px 15px', fontFamily: '"Space Mono", monospace', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.target.style.background = '#222'}
                    onMouseLeave={(e) => e.target.style.background = '#000'}
                  >
                    {'<'}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev < activeArt.images.length - 1 ? prev + 1 : 0));
                    }}
                    style={{ background: '#000', color: '#ccff00', border: '1px solid #ccff00', padding: '5px 15px', fontFamily: '"Space Mono", monospace', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.target.style.background = '#222'}
                    onMouseLeave={(e) => e.target.style.background = '#000'}
                  >
                    {'>'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ 
            fontFamily: '"Space Mono", monospace',
            lineHeight: '1.6', 
            color: '#000', 
            fontSize: '0.85em', 
            fontWeight: '400',
            whiteSpace: 'pre-line',
            borderLeft: '4px solid #ccff00',
            paddingLeft: '15px',
            textTransform: 'uppercase'
          }}>{activeArt.description}</div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '40px' }}>
            <button 
              onClick={() => alert(`Añadido al carrito: ${activeArt.title}`)}
              style={{
                flex: 1,
                padding: '16px 10px',
                background: '#000',
                color: '#ccff00',
                border: '1px solid #000',
                borderRadius: '0px',
                fontFamily: '"Space Mono", monospace',
                fontWeight: '700',
                fontSize: '0.9em',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#ccff00'; e.target.style.color = '#000'; }}
              onMouseLeave={(e) => { e.target.style.background = '#000'; e.target.style.color = '#ccff00'; }}
            >
              [ BUY_NOW ]
            </button>
            
            <button 
              onClick={(e) => {
                e.target.blur();
                setActiveArt(null);
              }}
              style={{
                flex: 1,
                padding: '16px 10px',
                background: 'transparent',
                color: '#000',
                border: '1px solid #000',
                borderRadius: '0px',
                fontFamily: '"Space Mono", monospace',
                fontWeight: '700',
                fontSize: '0.9em',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#000'; e.target.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#000'; }}
            >
              EXIT //
            </button>
          </div>
        </div>
      )}
      {!activeArt && (
        <div 
          id="hud-crosshair"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'all 0.2s ease-out'
          }}
        >
          <div className="crosshair-dot" style={{
            width: '6px',
            height: '6px',
            background: 'white',
            borderRadius: '50%',
            mixBlendMode: 'difference'
          }} />
        </div>
      )}
    </div>
  )
}
