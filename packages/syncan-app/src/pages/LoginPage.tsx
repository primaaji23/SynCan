import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Login failed:", data);

        // Handle disabled account specifically
        if (data.disabled) {
          const disabledDate = data.disabledAt
            ? new Date(data.disabledAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
            : 'Tanggal tidak diketahui';

          setErrorMessage(
            `❌ Akun dinonaktifkan\n\n` +
            `Alasan: ${data.disabledReason || 'Tidak disebutkan'}\n` +
            `Dinonaktifkan oleh: ${data.disabledBy || 'Administrator'}\n` +
            `Tanggal: ${disabledDate}\n\n` +
            `Hubungi administrator untuk informasi lebih lanjut.`
          );
        } else {
          // Untuk error biasa
          setErrorMessage(data.error || "Username atau password salah");
        }

        setIsLoading(false);
        return;
      }

      if (!data.token || !data.role) {
        console.error("Invalid login response:", data);
        setErrorMessage("Response login tidak valid");
        setIsLoading(false);
        return;
      }

      const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 jam

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("expiresAt", expiresAt.toString());

      // Simpan info user tambahan jika ada
      if (data.user) {
        localStorage.setItem("userId", data.user.id || "");
        localStorage.setItem("username", data.user.username || username);
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Terjadi kesalahan koneksi. Periksa jaringan Anda.");
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      <style>{`
        .login-container {
          height: 100vh; 
          width: 100vw; 
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(to right, #b91c1c, #dc2626);
          font-family: 'Segoe UI', sans-serif;
          overflow: hidden; 
          position: fixed; 
          top: 0;
          left: 0;
          padding: 20px;
          box-sizing: border-box; 
        }

        .animated-bg {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 0;
          pointer-events: none;
        }
      
        .login-card {
          position: relative;
          z-index: 1;
          background: white;
          width: 100%;
          max-width: 400px;
          padding: 30px; 
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          text-align: center;
          max-height: 90vh;
          overflow-y: auto; 
        }

        .logo {
          width: 300px;
          margin-bottom: 25px;
        }

        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          white-space: pre-line;
          line-height: 1.5;
        }

        .error-normal {
          background-color: #fefce8;
          border: 1px solid #fde68a;
          color: #92400e;
        }

        .error-disabled {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .error-disclaimer {
          margin-top: 8px;
          font-size: 12px;
          color: #dc2626;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-group input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          box-sizing: border-box;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #dc2626;
        }

        .toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .toggle-btn:hover {
          background-color: #f1f5f9;
        }

        .login-btn {
          width: 100%;
          background: #dc2626;
          color: white;
          padding: 14px;
          font-size: 1rem;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-btn:hover {
          background: #b91c1c;
        }

        .login-btn:disabled {
          background: #999;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .powered-by {
          font-size: 0.8rem;
          color: #666;
          margin-top: 20px;
        }

        .powered-by b {
          color: #dc2626;
        }

        .support-info {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 5px;
          font-weight: 600;
        }
      `}</style>

      <svg
        className="animated-bg"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="200" cy="100" r="80" fill="#ffffff22">
          <animate
            attributeName="cy"
            values="100;150;100"
            dur="6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="600" cy="400" r="120" fill="#ffffff15">
          <animate
            attributeName="cy"
            values="400;450;400"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="400" cy="300" r="50" fill="#ffffff18">
          <animate
            attributeName="r"
            values="50;60;50"
            dur="5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      <div className="login-card">
        {<img className="logo" src={`${process.env.PUBLIC_URL}/SynCan0.png`} alt="Synchronized Candi Network" />}

        {/* Error Message */}
        {errorMessage && (
          <div className={`error-message ${errorMessage.includes("dinonaktifkan") ? "error-disabled" : "error-normal"}`}>
            {errorMessage}
            {errorMessage.includes("dinonaktifkan") && (
              <div className="error-disclaimer">
                ⚠️ Akun tidak dapat digunakan sampai diaktifkan kembali oleh admin
              </div>
            )}
          </div>
        )}

        <form onSubmit={login}>
          <div className="form-group">
            <label>Username</label>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="login-btn" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Memproses...
              </>
            ) : "Login"}
          </button>
        </form>

        <p className="powered-by">
          Powered by <b>Candi Elektronik</b>
          <div className="support-info">
            © 2026 SynCan. All rights reserved.
          </div>
        </p>
      </div>
    </div>
  );
}