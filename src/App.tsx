export default function App() {
  return (
    <div>
      <video
        src="/TestLogo.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: 100,
          height: 100,
          position: "fixed",
          top: 50,
          left: 50,
        }}
      />

      <div style={{ padding: 50 }}>
        
      </div>
    </div>
  );
}