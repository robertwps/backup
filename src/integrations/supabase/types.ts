export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          criada_em: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          criada_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          criada_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf: string | null
          criado_em: string
          email: string | null
          id: string
          nome_completo: string | null
          telefone: string | null
        }
        Insert: {
          cpf?: string | null
          criado_em?: string
          email?: string | null
          id: string
          nome_completo?: string | null
          telefone?: string | null
        }
        Update: {
          cpf?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      combo_settings: {
        Row: {
          ativo: boolean
          atualizado_em: string
          desconto: number
          id: number
          produto_id: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          desconto?: number
          id?: number
          produto_id?: string | null
          titulo?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          desconto?: number
          id?: number
          produto_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_settings_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativa: boolean
          codigo: string
          criado_em: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          codigo: string
          criado_em?: string
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          ativa?: boolean
          codigo?: string
          criado_em?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string | null
          cep: string
          cidade: string | null
          cliente_id: string
          complemento: string | null
          criado_em: string
          estado: string | null
          id: string
          numero: string | null
          rua: string
        }
        Insert: {
          bairro?: string | null
          cep: string
          cidade?: string | null
          cliente_id: string
          complemento?: string | null
          criado_em?: string
          estado?: string | null
          id?: string
          numero?: string | null
          rua: string
        }
        Update: {
          bairro?: string | null
          cep?: string
          cidade?: string | null
          cliente_id?: string
          complemento?: string | null
          criado_em?: string
          estado?: string | null
          id?: string
          numero?: string | null
          rua?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_emails: {
        Row: {
          assunto: string
          corpo_html: string
          criado_em: string
          destinatario: string
          enviado: boolean
          enviado_em: string | null
          id: string
        }
        Insert: {
          assunto: string
          corpo_html: string
          criado_em?: string
          destinatario: string
          enviado?: boolean
          enviado_em?: string | null
          id?: string
        }
        Update: {
          assunto?: string
          corpo_html?: string
          criado_em?: string
          destinatario?: string
          enviado?: boolean
          enviado_em?: string | null
          id?: string
        }
        Relationships: []
      }
      imagens_produto: {
        Row: {
          criada_em: string
          id: string
          ordem: number
          produto_id: string
          url_storage: string
        }
        Insert: {
          criada_em?: string
          id?: string
          ordem?: number
          produto_id: string
          url_storage: string
        }
        Update: {
          criada_em?: string
          id?: string
          ordem?: number
          produto_id?: string
          url_storage?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          comprimento: string | null
          criado_em: string
          id: string
          nome_produto: string
          pedido_id: string
          preco_unit: number
          produto_id: string | null
          quantidade: number
          variante_id: string | null
        }
        Insert: {
          comprimento?: string | null
          criado_em?: string
          id?: string
          nome_produto: string
          pedido_id: string
          preco_unit: number
          produto_id?: string | null
          quantidade?: number
          variante_id?: string | null
        }
        Update: {
          comprimento?: string | null
          criado_em?: string
          id?: string
          nome_produto?: string
          pedido_id?: string
          preco_unit?: number
          produto_id?: string | null
          quantidade?: number
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          atualizado_em: string
          carrinho_abandonado: boolean
          cliente_id: string | null
          codigo_rastreio: string | null
          criado_em: string
          cupom_codigo: string | null
          desconto: number
          email_contato: string | null
          endereco_id: string | null
          frete: number
          frete_tipo: string | null
          id: string
          metodo_pagamento: string | null
          nome_contato: string | null
          numero: number
          status: string
          subtotal: number
          telefone_contato: string | null
          total: number
        }
        Insert: {
          atualizado_em?: string
          carrinho_abandonado?: boolean
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          cupom_codigo?: string | null
          desconto?: number
          email_contato?: string | null
          endereco_id?: string | null
          frete?: number
          frete_tipo?: string | null
          id?: string
          metodo_pagamento?: string | null
          nome_contato?: string | null
          numero?: number
          status?: string
          subtotal?: number
          telefone_contato?: string | null
          total?: number
        }
        Update: {
          atualizado_em?: string
          carrinho_abandonado?: boolean
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          cupom_codigo?: string | null
          desconto?: number
          email_contato?: string | null
          endereco_id?: string | null
          frete?: number
          frete_tipo?: string | null
          id?: string
          metodo_pagamento?: string | null
          nome_contato?: string | null
          numero?: number
          status?: string
          subtotal?: number
          telefone_contato?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          criado_em: string
          descricao: string | null
          destaque: boolean
          estoque_minimo: number
          id: string
          imagem_principal: string | null
          imagem_url: string | null
          material: string
          nome: string
          preco: number
          preco_custo: number
          preco_promocional: number | null
          sku: string | null
          slug: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destaque?: boolean
          estoque_minimo?: number
          id?: string
          imagem_principal?: string | null
          imagem_url?: string | null
          material?: string
          nome: string
          preco?: number
          preco_custo?: number
          preco_promocional?: number | null
          sku?: string | null
          slug: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destaque?: boolean
          estoque_minimo?: number
          id?: string
          imagem_principal?: string | null
          imagem_url?: string | null
          material?: string
          nome?: string
          preco?: number
          preco_custo?: number
          preco_promocional?: number | null
          sku?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variantes_produto: {
        Row: {
          comprimento: string
          criado_em: string
          estoque: number
          id: string
          produto_id: string
        }
        Insert: {
          comprimento: string
          criado_em?: string
          estoque?: number
          id?: string
          produto_id: string
        }
        Update: {
          comprimento?: string
          criado_em?: string
          estoque?: number
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variantes_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cliente"],
    },
  },
} as const
