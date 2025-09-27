import React, { useState, useEffect } from 'react'

interface Device {
  id: string
  name: string
  type: string
  status: 'on' | 'off'
  lastSeen: string
}

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDevices([
        {
          id: '1',
          name: 'Living Room Light',
          type: 'Light',
          status: 'on',
          lastSeen: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Kitchen Temperature Sensor',
          type: 'Sensor',
          status: 'off',
          lastSeen: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Front Door Camera',
          type: 'Camera',
          status: 'on',
          lastSeen: new Date().toISOString()
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const toggleDevice = (deviceId: string) => {
    setDevices(devices.map(device => 
      device.id === deviceId 
        ? { ...device, status: device.status === 'on' ? 'off' : 'on' }
        : device
    ))
  }

  if (loading) {
    return (
      <div className="card">
        <h2>Dashboard</h2>
        <p>Loading devices...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h2>Device Dashboard</h2>
        <p>Manage and monitor your connected devices</p>
      </div>
      
      <div className="card">
        <h3>Connected Devices ({devices.length})</h3>
        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          {devices.map(device => (
            <div key={device.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              backgroundColor: '#fafafa'
            }}>
              <div>
                <strong>{device.name}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {device.type} • Last seen: {new Date(device.lastSeen).toLocaleString()}
                </small>
              </div>
              <button 
                onClick={() => toggleDevice(device.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: device.status === 'on' ? '#4CAF50' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {device.status === 'on' ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
