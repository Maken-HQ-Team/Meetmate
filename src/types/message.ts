export interface Message {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
    updated_at?: string;
    is_read?: boolean;   // 👈 make optional
    read_at?: string;
    reply_to_id?: string;
    reply_to?: {
      id: string;
      content: string;
      sender_name: string;
    };
    reactions?: {
      [key: string]: string[];
    };
    status?: 'sending' | 'sent' | 'delivered' | 'read';
  }
