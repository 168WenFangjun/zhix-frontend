import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPaymentSession, processApplePayment } from '../utils/paymentService';

const Membership = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const returnUrl = location.state?.from || '/';

  const handleApplePay = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const orderId = 'ORDER_' + Date.now();
      const amount = 39.99;
      
      // 创建支付会话
      const sessionData = await createPaymentSession(
        orderId,
        amount,
        'CNY',
        'ZhiX会员月费'
      );
      
      if (sessionData.merchantSessionIdentifier || sessionData.nonce) {
        // 模拟 Apple Pay 支付流程
        alert('Apple Pay 支付窗口将打开（开发环境模拟）');
        
        // 处理支付
        const processData = await processApplePayment(
          orderId,
          amount,
          'membership'
        );
        
        if (processData.success && processData.status === 'completed') {
          setPaymentSuccess(true);
          // 刷新用户信息
          const updatedUser = { ...user, isPremium: true };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          updateUser(updatedUser);
          // 2秒后自动跳转
          setTimeout(() => {
            navigate(returnUrl);
          }, 2000);
        } else {
          setError(processData.error || '支付失败，请重试');
        }
      } else {
        setError(sessionData.error || '创建支付会话失败');
      }
    } catch (error) {
      setError('支付失败: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>开通会员</h1>
        <div style={styles.price}>
          <span style={styles.priceAmount}>¥39.99</span>
          <span style={styles.pricePeriod}>/月</span>
        </div>
        <ul style={styles.features}>
          <li>✓ 解锁所有付费文章</li>
          <li>✓ 无广告阅读体验</li>
          <li>✓ 优先评论通知</li>
          <li>✓ 专属会员标识</li>
        </ul>
        
        <div style={styles.paymentSection}>
          <div style={styles.paymentInfo}>
            <p style={styles.paymentText}>🍎 Apple Pay</p>
            <p style={styles.paymentSubtext}>安全、快速的支付方式</p>
          </div>
          <button
            style={styles.payBtn}
            onClick={handleApplePay}
            disabled={processing || !user}
          >
            {processing ? '处理中...' : '🍎 Apple Pay 支付'}
          </button>
          {!user && (
            <p style={styles.loginHint}>请先登录后再支付</p>
          )}
        </div>

        {error && (
          <div style={styles.errorSection}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}

        {paymentSuccess && (
          <div style={styles.successSection}>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.successText}>支付成功！会员已开通</p>
            <p style={styles.redirectText}>正在跳转...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 200px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: '#fff',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '2rem',
    color: '#111827',
  },
  price: {
    marginBottom: '2rem',
  },
  priceAmount: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  pricePeriod: {
    fontSize: '1.5rem',
    color: '#6b7280',
  },
  features: {
    listStyle: 'none',
    textAlign: 'left',
    marginBottom: '2rem',
    padding: '0 2rem',
  },

  paymentSection: {
    marginBottom: '1rem',
  },
  paymentInfo: {
    textAlign: 'center',
    marginBottom: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
  },
  paymentText: {
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem',
  },
  paymentSubtext: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  payBtn: {
    width: '100%',
    padding: '1rem',
    background: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  successSection: {
    marginTop: '2rem',
    padding: '2rem',
    background: '#d1fae5',
    borderRadius: '8px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '3rem',
    color: '#10b981',
    marginBottom: '0.5rem',
  },
  successText: {
    color: '#065f46',
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  redirectText: {
    color: '#059669',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  errorSection: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#fee2e2',
    borderRadius: '8px',
    textAlign: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: '1rem',
  },
  loginHint: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#ef4444',
  },
};

export default Membership;
