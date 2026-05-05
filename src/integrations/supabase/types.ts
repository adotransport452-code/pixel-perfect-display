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
      clients: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      consignments: {
        Row: {
          advance_amount: number | null
          bill_charge: number | null
          bill_no: string
          calculation_factor: string | null
          calculation_rate: number | null
          cartoon: number | null
          cbm: number | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          ctn_no: string | null
          current_station: string | null
          description: string | null
          end_station: string
          expected_delivery_date: string | null
          freight: number | null
          goods_advance: number | null
          grand_total: number | null
          id: string
          image_url: string | null
          insurance: number | null
          loading_fee: number | null
          local_freight: number | null
          marka: string
          package_type: string | null
          packaging_fee: number | null
          payment_amount: number | null
          payment_of_goods: number | null
          payment_status: string | null
          quantity: number | null
          remarks: string | null
          serial_prefix: string | null
          start_date: string
          start_station: string
          status: string | null
          sub_total: number | null
          tax: number | null
          trade_mode: string | null
          unloading_fee: number | null
          updated_at: string
          value_of_goods: number | null
          weight: number | null
        }
        Insert: {
          advance_amount?: number | null
          bill_charge?: number | null
          bill_no: string
          calculation_factor?: string | null
          calculation_rate?: number | null
          cartoon?: number | null
          cbm?: number | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          ctn_no?: string | null
          current_station?: string | null
          description?: string | null
          end_station: string
          expected_delivery_date?: string | null
          freight?: number | null
          goods_advance?: number | null
          grand_total?: number | null
          id?: string
          image_url?: string | null
          insurance?: number | null
          loading_fee?: number | null
          local_freight?: number | null
          marka: string
          package_type?: string | null
          packaging_fee?: number | null
          payment_amount?: number | null
          payment_of_goods?: number | null
          payment_status?: string | null
          quantity?: number | null
          remarks?: string | null
          serial_prefix?: string | null
          start_date: string
          start_station: string
          status?: string | null
          sub_total?: number | null
          tax?: number | null
          trade_mode?: string | null
          unloading_fee?: number | null
          updated_at?: string
          value_of_goods?: number | null
          weight?: number | null
        }
        Update: {
          advance_amount?: number | null
          bill_charge?: number | null
          bill_no?: string
          calculation_factor?: string | null
          calculation_rate?: number | null
          cartoon?: number | null
          cbm?: number | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          ctn_no?: string | null
          current_station?: string | null
          description?: string | null
          end_station?: string
          expected_delivery_date?: string | null
          freight?: number | null
          goods_advance?: number | null
          grand_total?: number | null
          id?: string
          image_url?: string | null
          insurance?: number | null
          loading_fee?: number | null
          local_freight?: number | null
          marka?: string
          package_type?: string | null
          packaging_fee?: number | null
          payment_amount?: number | null
          payment_of_goods?: number | null
          payment_status?: string | null
          quantity?: number | null
          remarks?: string | null
          serial_prefix?: string | null
          start_date?: string
          start_station?: string
          status?: string | null
          sub_total?: number | null
          tax?: number | null
          trade_mode?: string | null
          unloading_fee?: number | null
          updated_at?: string
          value_of_goods?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      delivery_receipts: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string
          consignment_ids: Json | null
          created_at: string
          created_by: string | null
          id: string
          receiver_email: string | null
          receiver_name: string
          receiver_phone: string
          remarks: string | null
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone: string
          consignment_ids?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          receiver_email?: string | null
          receiver_name: string
          receiver_phone: string
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string
          consignment_ids?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          receiver_email?: string | null
          receiver_name?: string
          receiver_phone?: string
          remarks?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      overall_details: {
        Row: {
          arrival_at_lhasa: string | null
          cbm: number | null
          client: string | null
          consignment_no: string
          created_at: string
          created_by: string | null
          date: string | null
          destination: string | null
          dispatched_from_origin: string | null
          gw: number | null
          id: string
          kerung_containers: Json | null
          kerung_total_containers: number | null
          lhasa_containers: Json | null
          lhasa_total_containers: number | null
          loaded_ctns: number | null
          lot_no: string | null
          marka: string | null
          multi_values: Json
          nylam_arrival_dates: Json | null
          origin: string
          origin_container: string | null
          received_ctns_at_nylam: number | null
          remarks: string | null
          status: string | null
          tatopani_containers: Json | null
          tatopani_total_containers: number | null
          total_ctns: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arrival_at_lhasa?: string | null
          cbm?: number | null
          client?: string | null
          consignment_no: string
          created_at?: string
          created_by?: string | null
          date?: string | null
          destination?: string | null
          dispatched_from_origin?: string | null
          gw?: number | null
          id?: string
          kerung_containers?: Json | null
          kerung_total_containers?: number | null
          lhasa_containers?: Json | null
          lhasa_total_containers?: number | null
          loaded_ctns?: number | null
          lot_no?: string | null
          marka?: string | null
          multi_values?: Json
          nylam_arrival_dates?: Json | null
          origin: string
          origin_container?: string | null
          received_ctns_at_nylam?: number | null
          remarks?: string | null
          status?: string | null
          tatopani_containers?: Json | null
          tatopani_total_containers?: number | null
          total_ctns?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arrival_at_lhasa?: string | null
          cbm?: number | null
          client?: string | null
          consignment_no?: string
          created_at?: string
          created_by?: string | null
          date?: string | null
          destination?: string | null
          dispatched_from_origin?: string | null
          gw?: number | null
          id?: string
          kerung_containers?: Json | null
          kerung_total_containers?: number | null
          lhasa_containers?: Json | null
          lhasa_total_containers?: number | null
          loaded_ctns?: number | null
          lot_no?: string | null
          marka?: string | null
          multi_values?: Json
          nylam_arrival_dates?: Json | null
          origin?: string
          origin_container?: string | null
          received_ctns_at_nylam?: number | null
          remarks?: string | null
          status?: string | null
          tatopani_containers?: Json | null
          tatopani_total_containers?: number | null
          total_ctns?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          consignment_details: Json | null
          consignment_ids: Json
          created_at: string
          discount: number
          id: string
          initiated_by: string | null
          paid_amount: number
          receipt_url: string | null
          remaining_amount: number
          remarks: string | null
          status: string
          sub_total: number
          updated_at: string
          verifier: string | null
        }
        Insert: {
          amount?: number
          consignment_details?: Json | null
          consignment_ids?: Json
          created_at?: string
          discount?: number
          id?: string
          initiated_by?: string | null
          paid_amount?: number
          receipt_url?: string | null
          remaining_amount?: number
          remarks?: string | null
          status?: string
          sub_total?: number
          updated_at?: string
          verifier?: string | null
        }
        Update: {
          amount?: number
          consignment_details?: Json | null
          consignment_ids?: Json
          created_at?: string
          discount?: number
          id?: string
          initiated_by?: string | null
          paid_amount?: number
          receipt_url?: string | null
          remaining_amount?: number
          remarks?: string | null
          status?: string
          sub_total?: number
          updated_at?: string
          verifier?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          disabled: boolean
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          email: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          arrival_approved_by: string | null
          consignment_ids: Json | null
          container_image_url: string | null
          container_name: string
          container_type: string | null
          created_at: string
          created_by: string | null
          dispatched_by: string | null
          driver_name: string | null
          driver_phone: string | null
          end_station: string
          id: string
          lot_no: string
          remarks: string | null
          start_station: string
          status: string | null
          updated_at: string
        }
        Insert: {
          arrival_approved_by?: string | null
          consignment_ids?: Json | null
          container_image_url?: string | null
          container_name: string
          container_type?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_station: string
          id?: string
          lot_no: string
          remarks?: string | null
          start_station: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          arrival_approved_by?: string | null
          consignment_ids?: Json | null
          container_image_url?: string | null
          container_name?: string
          container_type?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_station?: string
          id?: string
          lot_no?: string
          remarks?: string | null
          start_station?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          cbm_rate: number | null
          code: string
          created_at: string
          id: string
          location: string | null
          name: string
          phone: string | null
          updated_at: string
          weight_rate: number | null
        }
        Insert: {
          cbm_rate?: number | null
          code: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          weight_rate?: number | null
        }
        Update: {
          cbm_rate?: number | null
          code?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          weight_rate?: number | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          billing: boolean
          clients: boolean
          consignments: boolean
          dashboard: boolean
          delivery_receipts: boolean
          overall_details: boolean
          payments: boolean
          reports: boolean
          settings: boolean
          shipments: boolean
          stations: boolean
          tracking: boolean
          tracking_system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          billing?: boolean
          clients?: boolean
          consignments?: boolean
          dashboard?: boolean
          delivery_receipts?: boolean
          overall_details?: boolean
          payments?: boolean
          reports?: boolean
          settings?: boolean
          shipments?: boolean
          stations?: boolean
          tracking?: boolean
          tracking_system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          billing?: boolean
          clients?: boolean
          consignments?: boolean
          dashboard?: boolean
          delivery_receipts?: boolean
          overall_details?: boolean
          payments?: boolean
          reports?: boolean
          settings?: boolean
          shipments?: boolean
          stations?: boolean
          tracking?: boolean
          tracking_system?: boolean
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "client"
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
      app_role: ["admin", "staff", "client"],
    },
  },
} as const
