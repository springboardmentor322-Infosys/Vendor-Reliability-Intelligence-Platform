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
      communications: {
        Row: {
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          purchase_order_id: string | null
          resolution_time_hours: number | null
          response_time_hours: number | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          subject: string
          thread_id: string
          vendor_id: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          created_at?: string
          id?: string
          purchase_order_id?: string | null
          resolution_time_hours?: number | null
          response_time_hours?: number | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          subject: string
          thread_id?: string
          vendor_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          purchase_order_id?: string | null
          resolution_time_hours?: number | null
          response_time_hours?: number | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          subject?: string
          thread_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean
          certifications: Json
          compliance_score: number
          contract_number: string
          created_at: string
          document_path: string | null
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
          value: number
          vendor_id: string
        }
        Insert: {
          auto_renew?: boolean
          certifications?: Json
          compliance_score?: number
          contract_number: string
          created_at?: string
          document_path?: string | null
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string
          value?: number
          vendor_id: string
        }
        Update: {
          auto_renew?: boolean
          certifications?: Json
          compliance_score?: number
          contract_number?: string
          created_at?: string
          document_path?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string
          value?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          days_late: number
          delivered_date: string | null
          id: string
          promised_date: string | null
          purchase_order_id: string
          quantity_delivered: number
          shipped_date: string | null
          shipping_mode: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_number: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          days_late?: number
          delivered_date?: string | null
          id?: string
          promised_date?: string | null
          purchase_order_id: string
          quantity_delivered?: number
          shipped_date?: string | null
          shipping_mode?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_number?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          days_late?: number
          delivered_date?: string | null
          id?: string
          promised_date?: string | null
          purchase_order_id?: string
          quantity_delivered?: number
          shipped_date?: string | null
          shipping_mode?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_number?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string
          paid_date: string | null
          purchase_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string
          paid_date?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string
          paid_date?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          severity: string
          title: string
          type: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          severity?: string
          title: string
          type: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          severity?: string
          title?: string
          type?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          department: string | null
          id: string
          name: string
          sku: string
          unit_price: number
          vendor_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          department?: string | null
          id?: string
          name: string
          sku: string
          unit_price?: number
          vendor_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          sku?: string
          unit_price?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          priority: string
          requested_by: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["po_status"]
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          priority?: string
          requested_by?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          priority?: string
          requested_by?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          created_at: string
          defect_count: number
          delivery_id: string | null
          id: string
          inspected_at: string
          inspector_name: string | null
          notes: string | null
          passed: boolean
          quality_score: number
          vendor_id: string
        }
        Insert: {
          created_at?: string
          defect_count?: number
          delivery_id?: string | null
          id?: string
          inspected_at?: string
          inspector_name?: string | null
          notes?: string | null
          passed?: boolean
          quality_score?: number
          vendor_id: string
        }
        Update: {
          created_at?: string
          defect_count?: number
          delivery_id?: string | null
          id?: string
          inspected_at?: string
          inspector_name?: string | null
          notes?: string | null
          passed?: boolean
          quality_score?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["vendor_category"]
          city: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          onboarded_at: string
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["vendor_category"]
          city?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          onboarded_at?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["vendor_category"]
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          onboarded_at?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      current_vendor_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "administrator"
        | "procurement_manager"
        | "supply_chain_manager"
        | "vendor"
        | "finance_officer"
        | "auditor"
      contract_status:
        | "draft"
        | "active"
        | "expiring"
        | "expired"
        | "terminated"
      delivery_status:
        | "pending"
        | "shipped"
        | "in_transit"
        | "delivered"
        | "delayed"
        | "cancelled"
      invoice_status:
        | "draft"
        | "submitted"
        | "approved"
        | "paid"
        | "overdue"
        | "disputed"
      po_status:
        | "pending"
        | "approved"
        | "ordered"
        | "delivered"
        | "completed"
        | "cancelled"
      vendor_category:
        | "raw_material"
        | "equipment"
        | "it"
        | "service"
        | "logistics"
        | "maintenance"
      vendor_status: "active" | "inactive" | "pending" | "suspended"
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
      app_role: [
        "administrator",
        "procurement_manager",
        "supply_chain_manager",
        "vendor",
        "finance_officer",
        "auditor",
      ],
      contract_status: ["draft", "active", "expiring", "expired", "terminated"],
      delivery_status: [
        "pending",
        "shipped",
        "in_transit",
        "delivered",
        "delayed",
        "cancelled",
      ],
      invoice_status: [
        "draft",
        "submitted",
        "approved",
        "paid",
        "overdue",
        "disputed",
      ],
      po_status: [
        "pending",
        "approved",
        "ordered",
        "delivered",
        "completed",
        "cancelled",
      ],
      vendor_category: [
        "raw_material",
        "equipment",
        "it",
        "service",
        "logistics",
        "maintenance",
      ],
      vendor_status: ["active", "inactive", "pending", "suspended"],
    },
  },
} as const
