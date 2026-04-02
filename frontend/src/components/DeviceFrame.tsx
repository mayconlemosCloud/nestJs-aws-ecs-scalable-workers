import type { ReactNode } from 'react';
import './DeviceFrame.css';

interface Props {
  children: ReactNode;
}

export function DeviceFrame({ children }: Props) {
  return (
    <div className="device-wrapper">
      <div className="device-frame">
        <div className="device-notch"></div>
        <div className="device-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
