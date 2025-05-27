export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alert_styles: {
        Row: {
          animation_type: string | null
          background_color: string
          created_at: string | null
          description: string | null
          duration: number | null
          font_family: string | null
          id: string
          is_active: boolean | null
          name: string
          sound: string | null
          text_color: string
          user_id: string | null
          volume: number | null
        }
        Insert: {
          animation_type?: string | null
          background_color: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sound?: string | null
          text_color: string
          user_id?: string | null
          volume?: number | null
        }
        Update: {
          animation_type?: string | null
          background_color?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sound?: string | null
          text_color?: string
          user_id?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      donation_page_settings: {
        Row: {
          background_image: string | null
          created_at: string | null
          custom_thank_you_message: string
          custom_url: string | null
          description: string
          goal_amount: number
          id: string
          primary_color: string
          secondary_color: string
          show_average: boolean
          show_donation_goal: boolean
          show_recent_donors: boolean
          show_sponsors: boolean | null
          show_supporters: boolean
          sponsor_banner_image: string | null
          sponsor_banner_link: string | null
          sponsor_logos: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background_image?: string | null
          created_at?: string | null
          custom_thank_you_message?: string
          custom_url?: string | null
          description?: string
          goal_amount?: number
          id?: string
          primary_color?: string
          secondary_color?: string
          show_average?: boolean
          show_donation_goal?: boolean
          show_recent_donors?: boolean
          show_sponsors?: boolean | null
          show_supporters?: boolean
          sponsor_banner_image?: string | null
          sponsor_banner_link?: string | null
          sponsor_logos?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background_image?: string | null
          created_at?: string | null
          custom_thank_you_message?: string
          custom_url?: string | null
          description?: string
          goal_amount?: number
          id?: string
          primary_color?: string
          secondary_color?: string
          show_average?: boolean
          show_donation_goal?: boolean
          show_recent_donors?: boolean
          show_sponsors?: boolean | null
          show_supporters?: boolean
          sponsor_banner_image?: string | null
          sponsor_banner_link?: string | null
          sponsor_logos?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string | null
          donor_name: string
          id: number
          message: string | null
          payment_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          donor_name: string
          id?: number
          message?: string | null
          payment_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          donor_name?: string
          id?: number
          message?: string | null
          payment_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      obs_tokens: {
        Row: {
          created_at: string | null
          id: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          donor_name: string
          id: number
          message: string | null
          razorpay_order_id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          donor_name: string
          id?: number
          message?: string | null
          razorpay_order_id: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          donor_name?: string
          id?: number
          message?: string | null
          razorpay_order_id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          channel_link: string | null
          created_at: string | null
          display_name: string | null
          id: string
          razorpay_account_id: string | null
          streamer_name: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          channel_link?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          razorpay_account_id?: string | null
          streamer_name?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          channel_link?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          razorpay_account_id?: string | null
          streamer_name?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
