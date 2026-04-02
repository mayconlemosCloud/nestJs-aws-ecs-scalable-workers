import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard,
  Barcode,
  ArrowRightLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import './App.css';
import './Login.css'; // Estilos premium da tela inicial
import { DeviceFrame } from './components/DeviceFrame';
import { UserService } from './services/user.service';
import { TransactionService } from './services/transaction.service';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [newLimitAmount, setNewLimitAmount] = useState<number | ''>('');

  const handleCreateNewAccount = async () => {
    const amount = Number(newLimitAmount);
    if (!amount || amount <= 0) {
      setError('Insira um limite válido para abrir a conta.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setLoading(true);
    try {
      const testUser = await UserService.setupTestUser(amount);
      setUser(testUser);
      await refreshData(testUser.id);
    } catch (e) {
      setError('Falha ao criar nova conta.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (userId: string) => {
    try {
      const [balanceData, historyData] = await Promise.all([
        UserService.getBalance(userId),
        TransactionService.getHistory(userId)
      ]);
      setUser((prev: any) => ({ ...prev, ...balanceData }));
      setTransactions(historyData);
    } catch(e) {
      console.error(e);
    }
  }

  const handleSimulateMenuClick = async (amount: number) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const result = await TransactionService.simulatePurchase(user.userId || user.id, amount);
    
    if (!result.success) {
      if (result.reason === 'ATO_SUSPEITO') {
        setError('⚠️ Proteção Antifraude: Muitas tentativas. Aguarde.');
      } else if (result.reason === 'DUPLICADA') {
        setError('❌ Transação já processada.');
      } else {
        setError('Erro na transação.');
      }
    } else {
      await refreshData(user.userId || user.id);
    }
    
    setLoading(false);
    setTimeout(() => setError(null), 3000);
  };

  // Se não tem usuário pronto, mostra Tela de Abertura de Conta (Login Simulator Premium)
  if (!user) {
    return (
      <DeviceFrame>
        <div className="itau-login-overlay">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="itau-alert" style={{top: '20px'}}>
                <AlertTriangle /><span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div>
            <div className="itau-logo-lg">Itaú</div>
            <h1 className="itau-welcome-text">
              feito para <strong>você.</strong>
            </h1>
          </div>

          <div className="itau-auth-panel">
            <div className="itau-input-group">
              <label>Qual será o limite do seu cartão?</label>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span style={{fontSize: '28px', fontWeight: 700, color: 'var(--itau-text-light)', marginRight: '8px'}}>R$</span>
                <input 
                  type="number" 
                  value={newLimitAmount}
                  onChange={(e) => setNewLimitAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="0,00"
                  className="itau-input"
                  style={{width: '100%'}}
                  disabled={loading}
                />
              </div>
            </div>
            
            <button 
              className="itau-btn-primary"
              onClick={handleCreateNewAccount}
              disabled={loading}
            >
              {loading ? 'Preparando sua conta...' : 'Abrir minha conta'}
            </button>
          </div>
        </div>
      </DeviceFrame>
    );
  }

  // Dashboard Itaú depois de "logado"
  return (
    <DeviceFrame>
      <div className="itau-app">
        {/* Alertas */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="itau-alert">
              <AlertTriangle /><span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Laranja/Azul */}
        <header className="itau-header">
          <div className="itau-header-profile">
            <div className="itau-avatar">CA</div>
            <h2>olá, cliente</h2>
          </div>
          <button 
            onClick={() => setUser(null)}
            style={{background:'rgba(255,255,255,0.2)', color:'white', border:'none', padding:'6px 12px', borderRadius:'16px', fontSize:'11px', cursor:'pointer'}}
          >
            Sair
          </button>
        </header>

        <main className="itau-content">
          {/* Card de Saldo */}
          <section className="itau-card">
            <div className="itau-balance-title">
              <span>limite disponível</span>
              <button 
                style={{background:'none', border:'none', cursor:'pointer', color:'#7E8C99'}} 
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <h1 className="itau-balance-amount">
              R$ {showBalance ? Number(user?.availableLimit || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '• • • •'}
            </h1>
            <div className="itau-balance-details">
              <span style={{color: '#1E2D4A', fontWeight: 500}}>limite total aprovado</span>
              <span>R$ {Number(user?.creditLimit || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
          </section>

          {/* Atalhos Rápidos */}
          <section className="itau-actions">
            <button className="itau-action-btn" onClick={() => handleSimulateMenuClick(50)} disabled={loading}>
              <ArrowRightLeft size={24} />
              <span>pix R$ 50</span>
            </button>
            <button className="itau-action-btn" onClick={() => handleSimulateMenuClick(300)} disabled={loading}>
              <Barcode size={24} />
              <span>boleto R$ 300</span>
            </button>
            <button className="itau-action-btn" onClick={() => handleSimulateMenuClick(1500)} disabled={loading}>
              <CreditCard size={24} />
              <span>fatura R$ 1.5K</span>
            </button>
          </section>

          {/* Extrato Recente */}
          <section className="itau-card">
            <div className="itau-balance-title" style={{marginBottom: '16px'}}>
              <span style={{color: '#1E2D4A', fontWeight: 600}}>últimos lançamentos</span>
              <ChevronRight size={18} />
            </div>
            
            <div className="itau-tx-list">
              {transactions.length === 0 && <p style={{fontSize:12, color:'#7e8c99'}}>Nenhum lançamento recente.</p>}
              {transactions.slice(0, 5).map((tx) => (
                <motion.div layout key={tx.id} initial={{opacity:0}} animate={{opacity:1}} className="itau-tx-item">
                  <div className="itau-tx-info">
                     <div className={`itau-tx-icon ${tx.status === 'APPROVED' ? 'success' : 'error'}`}>
                        {tx.status === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                     </div>
                     <div className="itau-tx-details">
                        <h4>{tx.status === 'APPROVED' ? 'Despesa paga' : 'Transação Bloqueada'}</h4>
                        <p>{new Date(tx.createdAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="itau-tx-value">
                     - R$ {Number(tx.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </DeviceFrame>
  );
}
