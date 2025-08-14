/**
 * PayPal Configuration
 * 
 * This file contains PayPal SDK configuration for handling payments.
 * Supports both sandbox and production environments.
 */

import {
    Client,
    Environment,
    LogLevel,
    OrdersController
} from '@paypal/paypal-server-sdk';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction ? Environment.Production : Environment.Sandbox;

// PayPal credentials
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.');
}

// Create PayPal client
export const paypalClient = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
    },
    timeout: 0,
    environment: environment,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});

// Export orders controller
export const ordersController = new OrdersController(paypalClient);

// PayPal configuration constants
export const PAYPAL_CONFIG = {
    currency: 'USD',
    intent: 'CAPTURE',
    applicationContext: {
        brandName: 'Prestige Designs',
        locale: 'en-US',
        landingPage: 'BILLING',
        shippingPreference: 'NO_SHIPPING',
        userAction: 'PAY_NOW',
        returnUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/paypal/success`,
        cancelUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/paypal/cancel`,
    },
} as const;

export { Environment };
