// Shapes taken from Cashfree's Payment Gateway "Orders" API (x-api-version 2026-01-01).
// Recurring billing is emulated on top of it: each renewal is a fresh Order the user
// pays, not an auto-debited mandate.

export type CreateOrderRequest = {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_phone: string;
    customer_name?: string;
    customer_email?: string;
  };
  order_meta?: {
    return_url?: string;
    notify_url?: string;
  };
  order_note?: string;
  order_tags?: Record<string, string>;
};

export type CashfreeOrderStatus = "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED";

export type CreateOrderResponse = {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: CashfreeOrderStatus;
  payment_session_id: string;
  order_expiry_time?: string;
  created_at?: string;
};

export type CashfreePaymentStatus =
  "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "CANCELLED" | "NOT_ATTEMPTED";

export type OrderPayment = {
  cf_payment_id: string;
  order_id: string;
  payment_status: CashfreePaymentStatus;
  payment_amount: number;
  payment_currency: string;
  payment_time: string;
  payment_group?: string;
};

export type OrderEntity = {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: CashfreeOrderStatus;
};

/** The three order/payment webhook event types we handle (Cashfree Orders API). */
export type CashfreeWebhookType =
  "PAYMENT_SUCCESS_WEBHOOK" | "PAYMENT_FAILED_WEBHOOK" | "PAYMENT_USER_DROPPED_WEBHOOK";

export type CashfreeWebhookPayload = {
  type: CashfreeWebhookType;
  event_time: string;
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
    };
    payment: {
      cf_payment_id: string;
      payment_status: CashfreePaymentStatus;
      payment_amount: number;
      payment_currency: string;
      payment_time: string;
    };
    customer_details?: {
      customer_id?: string;
      customer_email?: string;
      customer_phone?: string;
    };
    error_details?: {
      error_code?: string;
      error_description?: string;
    };
  };
};
