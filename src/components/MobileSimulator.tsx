import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, RotateCw, Wifi, BatteryMedium, Signal } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface MobileSimulatorProps {
  children: React.ReactNode;
}

type DeviceModel = 'xiaomi' | 'pixel' | 'iphone';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  notchType: 'punch-hole' | 'island';
}

const DEVICES: Record<DeviceModel, DeviceConfig> = {
  xiaomi: {
    name: 'Xiaomi / Redmi (390 × 844)',
    width: 390,
    height: 844,
    notchType: 'punch-hole',
  },
  pixel: {
    name: 'Galaxy / Pixel (412 × 892)',
    width: 412,
    height: 892,
    notchType: 'punch-hole',
  },
  iphone: {
    name: 'iPhone 15 Pro (393 × 852)',
    width: 393,
    height: 852,
    notchType: 'island',
  },
};

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({ children }) => {
  const isNative = Capacitor.isNativePlatform();
  const searchParams = new URLSearchParams(window.location.search);
  const isEmbedded = window.self !== window.top || searchParams.get('embedded') === 'true';

  // Se já estiver dentro do APK nativo ou dentro do iframe, renderiza o app diretamente
  if (isNative || isEmbedded) {
    return <>{children}</>;
  }

  // Estado do simulador na versão Desktop do navegador
  const [isSimActive, setIsSimActive] = useState<boolean>(() => {
    // Se a URL tiver ?sim=true ou se a tela for desktop, ativamos por padrão para testes
    if (searchParams.get('sim') === 'true') return true;
    if (searchParams.get('sim') === 'false') return false;
    return true; // Padrão no PC para permitir testes imediatos de celular
  });

  const [selectedDevice, setSelectedDevice] = useState<DeviceModel>('xiaomi');
  const [isLandscape, setIsLandscape] = useState(false);
  const [currentTime, setCurrentTime] = useState('17:50');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const device = DEVICES[selectedDevice];
  const screenWidth = isLandscape ? device.height : device.width;
  const screenHeight = isLandscape ? device.width : device.height;

  // Se o usuário desativou o simulador para ver no formato Desktop completo:
  if (!isSimActive) {
    return (
      <>
        {children}
        <button
          id="btn-open-mobile-sim"
          className="btn-floating-sim-toggle"
          onClick={() => setIsSimActive(true)}
          title="Abrir Simulador de Celular Android"
        >
          <Smartphone size={20} />
          <span>Simulador Celular</span>
        </button>
      </>
    );
  }

  const iframeSrc = `${window.location.pathname}?embedded=true`;

  return (
    <div className="simulator-backdrop">
      {/* Barra Superior de Controle do Simulador */}
      <header className="simulator-topbar">
        <div className="simulator-brand">
          <div className="sim-logo-icon">
            <Smartphone size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="sim-title">Simulador Mobile Edison League</h1>
            <span className="sim-subtitle">Resolução e proporções 100% fiéis ao smartphone</span>
          </div>
        </div>

        <div className="simulator-controls">
          {/* Seletor de Modelo */}
          <div className="sim-control-group">
            <label htmlFor="sim-device-select" className="sim-label">Aparelho:</label>
            <select
              id="sim-device-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value as DeviceModel)}
              className="sim-select"
            >
              <option value="xiaomi">Xiaomi / Redmi (390×844)</option>
              <option value="pixel">Galaxy / Pixel (412×892)</option>
              <option value="iphone">iPhone 15 Pro (393×852)</option>
            </select>
          </div>

          {/* Botão de Rotacionar */}
          <button
            className={`sim-tool-btn ${isLandscape ? 'active' : ''}`}
            onClick={() => setIsLandscape(!isLandscape)}
            title="Girar tela (Retrato / Paisagem)"
          >
            <RotateCw size={16} />
            <span>Girar</span>
          </button>

          {/* Alternar para Desktop */}
          <button
            className="sim-tool-btn"
            onClick={() => setIsSimActive(false)}
            title="Expandir para tela cheia de computador"
          >
            <Monitor size={16} />
            <span>Ver em Desktop</span>
          </button>
        </div>
      </header>

      {/* Palco Central com a Carcaça Realista do Smartphone */}
      <div className="simulator-stage">
        <div
          className={`phone-chassis ${isLandscape ? 'landscape' : 'portrait'}`}
          style={{
            width: `${screenWidth + 24}px`,
            height: `${screenHeight + 24}px`,
          }}
        >
          {/* Botões Físicos Laterais do Celular */}
          <div className="phone-button-volume-up" />
          <div className="phone-button-volume-down" />
          <div className="phone-button-power" />

          {/* Tela do Smartphone */}
          <div
            className="phone-screen"
            style={{
              width: `${screenWidth}px`,
              height: `${screenHeight}px`,
            }}
          >
            {/* Notch / Câmera Frontal */}
            {device.notchType === 'island' ? (
              <div className="phone-dynamic-island" />
            ) : (
              <div className="phone-punch-hole" />
            )}

            {/* Barra de Status Virtual do Celular */}
            <div className="phone-status-bar">
              <span className="phone-status-time">{currentTime}</span>
              <div className="phone-status-icons">
                <span className="phone-status-net">4G</span>
                <Signal size={12} />
                <Wifi size={13} />
                <BatteryMedium size={14} />
              </div>
            </div>

            {/* Iframe Executando a Aplicação nas Dimensões Exatas do Celular */}
            <iframe
              title="Edison League Mobile View"
              src={iframeSrc}
              className="phone-viewport-iframe"
            />

            {/* Barra Inferior de Gestos do Android / iOS */}
            <div className="phone-home-indicator">
              <div className="home-bar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
