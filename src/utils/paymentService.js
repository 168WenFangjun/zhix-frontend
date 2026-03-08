import { PAYMENT_API_URL } from '../config';

export const createPaymentSession = async (orderId, amount, currency, description) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${PAYMENT_API_URL}/api/payment/apple-pay/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ validationURL: 'https://apple-pay-gateway.apple.com/paymentservices/startSession' })
  });
  return response.json();
};

export const processApplePayment = async (orderId, amount, productType = 'membership', productId = null) => {
  const token = localStorage.getItem('token');
  const payload = {
    orderId,
    amount,
    productType,
    token: {
      paymentData: {
        version: 'EC_v1',
        data: 'mock_encrypted_data',
        signature: 'mock_signature',
        header: {
          ephemeralPublicKey: 'mock_public_key',
          publicKeyHash: 'mock_hash',
          transactionId: 'mock_transaction_' + Date.now()
        }
      },
      paymentMethod: {
        displayName: 'Apple Pay',
        network: 'Visa',
        type: 'debit'
      },
      transactionIdentifier: 'mock_transaction_' + Date.now()
    }
  };
  if (productId) payload.productId = productId;
  
  const response = await fetch(`${PAYMENT_API_URL}/api/payment/apple-pay/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const getPaymentStatus = async (orderId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${PAYMENT_API_URL}/api/payment/status/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

export const refundPayment = async (orderId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${PAYMENT_API_URL}/api/payment/refund/${orderId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
