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
      ai_usage_logs: {
        Row: {
          context: string | null
          cost_source: string
          cost_usd: number
          created_at: string | null
          details: Json | null
          id: string
          model_name: string | null
          operation_type: string
          theatre_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          total_tokens: number | null
        }
        Insert: {
          context?: string | null
          cost_source?: string
          cost_usd?: number
          created_at?: string | null
          details?: Json | null
          id?: string
          model_name?: string | null
          operation_type: string
          theatre_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          total_tokens?: number | null
        }
        Update: {
          context?: string | null
          cost_source?: string
          cost_usd?: number
          created_at?: string | null
          details?: Json | null
          id?: string
          model_name?: string | null
          operation_type?: string
          theatre_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      group_items: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          group_id: string | null
          id: string
          location_id: string | null
          name: string
          sort_order: number
          status: string
          status_note: string | null
          theatre_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          sort_order?: number
          status?: string
          status_note?: string | null
          theatre_id?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          sort_order?: number
          status?: string
          status_note?: string | null
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_items_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          approx_count: number | null
          code: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          embedding_context: string | null
          embedding_identity: string | null
          embedding_physical: string | null
          icon: string | null
          id: string
          location_id: string | null
          name: string
          performance_id: string | null
          short_id: string | null
          sort_order: number
          status: string
          status_note: string | null
          theatre_id: string
        }
        Insert: {
          approx_count?: number | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding_context?: string | null
          embedding_identity?: string | null
          embedding_physical?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name: string
          performance_id?: string | null
          short_id?: string | null
          sort_order?: number
          status?: string
          status_note?: string | null
          theatre_id?: string
        }
        Update: {
          approx_count?: number | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding_context?: string | null
          embedding_identity?: string | null
          embedding_physical?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name?: string
          performance_id?: string | null
          short_id?: string | null
          sort_order?: number
          status?: string
          status_note?: string | null
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_keywords: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          identity_weight: number
          keyword: string
          physical_weight: number
          source: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string | null
          id?: string
          identity_weight?: number
          keyword: string
          physical_weight?: number
          source?: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          identity_weight?: number
          keyword?: string
          physical_weight?: number
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invite_lookup_hits: {
        Row: {
          at: string
          id: number
          ip_hash: string
        }
        Insert: {
          at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          belongs_to: string | null
          code: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          embedding: string | null
          id: string
          kind: string
          map_image_url: string | null
          name: string
          sort_order: number
          theatre_id: string
          type: Database["public"]["Enums"]["location_type_enum"]
        }
        Insert: {
          belongs_to?: string | null
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          kind?: string
          map_image_url?: string | null
          name: string
          sort_order?: number
          theatre_id?: string
          type?: Database["public"]["Enums"]["location_type_enum"]
        }
        Update: {
          belongs_to?: string | null
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          kind?: string
          map_image_url?: string | null
          name?: string
          sort_order?: number
          theatre_id?: string
          type?: Database["public"]["Enums"]["location_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "locations_belongs_to_fkey"
            columns: ["belongs_to"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      note_mentions: {
        Row: {
          created_at: string | null
          id: string
          mention_label: string | null
          mention_type: Database["public"]["Enums"]["mention_type"]
          mentioned_id: string | null
          note_id: string | null
          theatre_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mention_label?: string | null
          mention_type: Database["public"]["Enums"]["mention_type"]
          mentioned_id?: string | null
          note_id?: string | null
          theatre_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mention_label?: string | null
          mention_type?: Database["public"]["Enums"]["mention_type"]
          mentioned_id?: string | null
          note_id?: string | null
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_mentions_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          embedding: string | null
          id: string
          is_master: boolean | null
          performance_id: string | null
          theatre_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_master?: boolean | null
          performance_id?: string | null
          theatre_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_master?: boolean | null
          performance_id?: string | null
          theatre_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_props: {
        Row: {
          act_number: number | null
          area: string | null
          cast_only: string | null
          column_index: number | null
          created_at: string | null
          description: string | null
          group_id: string | null
          handler: string | null
          id: string
          is_checked: boolean | null
          item_id: string | null
          item_name: string
          order: number | null
          performance_id: string
          place: string | null
          prep: string | null
          scene_name: string | null
          scene_number: number | null
          sort_order: number | null
          stages: string[] | null
          structured_at: string | null
          theatre_id: string
        }
        Insert: {
          act_number?: number | null
          area?: string | null
          cast_only?: string | null
          column_index?: number | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          handler?: string | null
          id?: string
          is_checked?: boolean | null
          item_id?: string | null
          item_name: string
          order?: number | null
          performance_id: string
          place?: string | null
          prep?: string | null
          scene_name?: string | null
          scene_number?: number | null
          sort_order?: number | null
          stages?: string[] | null
          structured_at?: string | null
          theatre_id?: string
        }
        Update: {
          act_number?: number | null
          area?: string | null
          cast_only?: string | null
          column_index?: number | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          handler?: string | null
          id?: string
          is_checked?: boolean | null
          item_id?: string | null
          item_name?: string
          order?: number | null
          performance_id?: string
          place?: string | null
          prep?: string | null
          scene_name?: string | null
          scene_number?: number | null
          sort_order?: number | null
          stages?: string[] | null
          structured_at?: string | null
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_props_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_props_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "group_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_props_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_props_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          embedding: string | null
          id: string
          image_url: string | null
          last_show_date: string | null
          notes: string | null
          premiere_date: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["performance_status_enum"]
          structure: string
          theatre_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["performance_status_enum"]
          structure?: string
          theatre_id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["performance_status_enum"]
          structure?: string
          theatre_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performances_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acts_collapsed: boolean
          collapse_done: boolean
          created_at: string | null
          current_theatre_id: string | null
          email: string | null
          full_name: string | null
          id: string
          list_detail: string
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
        }
        Insert: {
          acts_collapsed?: boolean
          collapse_done?: boolean
          created_at?: string | null
          current_theatre_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          list_detail?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Update: {
          acts_collapsed?: boolean
          collapse_done?: boolean
          created_at?: string | null
          current_theatre_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          list_detail?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_theatre_id_fkey"
            columns: ["current_theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          access_level: string | null
          active: boolean | null
          batch_group: string | null
          clicks: number | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          target_url: string
          theatre_id: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          active?: boolean | null
          batch_group?: string | null
          clicks?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          target_url: string
          theatre_id?: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          active?: boolean | null
          batch_group?: string | null
          clicks?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          target_url?: string
          theatre_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_checklist_items: {
        Row: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          is_prepared: boolean | null
          item_image_url_snapshot: string | null
          item_name_snapshot: string | null
          live_notes: string | null
          performance_prop_id: string | null
          scene_checklist_id: string
          theatre_id: string
        }
        Insert: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_prepared?: boolean | null
          item_image_url_snapshot?: string | null
          item_name_snapshot?: string | null
          live_notes?: string | null
          performance_prop_id?: string | null
          scene_checklist_id: string
          theatre_id?: string
        }
        Update: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_prepared?: boolean | null
          item_image_url_snapshot?: string | null
          item_name_snapshot?: string | null
          live_notes?: string | null
          performance_prop_id?: string | null
          scene_checklist_id?: string
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_checklist_items_performance_prop_id_fkey"
            columns: ["performance_prop_id"]
            isOneToOne: false
            referencedRelation: "performance_props"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklist_items_scene_checklist_id_fkey"
            columns: ["scene_checklist_id"]
            isOneToOne: false
            referencedRelation: "scene_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklist_items_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_checklists: {
        Row: {
          cast: string | null
          checklist_state: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_heartbeat: string | null
          performance_id: string
          scene_name: string | null
          scene_number: string
          show_date: string
          theatre_id: string
          type: string
        }
        Insert: {
          cast?: string | null
          checklist_state?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          performance_id: string
          scene_name?: string | null
          scene_number: string
          show_date: string
          theatre_id?: string
          type?: string
        }
        Update: {
          cast?: string | null
          checklist_state?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          performance_id?: string
          scene_name?: string | null
          scene_number?: string
          show_date?: string
          theatre_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_checklists_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklists_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          act_number: number | null
          created_at: string | null
          id: string
          name: string | null
          performance_id: string
          scene_number: number
          theatre_id: string
          type: string | null
        }
        Insert: {
          act_number?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          performance_id: string
          scene_number: number
          theatre_id?: string
          type?: string | null
        }
        Update: {
          act_number?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          performance_id?: string
          scene_number?: number
          theatre_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      show_list_checks: {
        Row: {
          done_at: string
          done_by: string | null
          id: string
          performance_prop_id: string
          show_list_id: string
          stage: string
          theatre_id: string
        }
        Insert: {
          done_at?: string
          done_by?: string | null
          id?: string
          performance_prop_id: string
          show_list_id: string
          stage: string
          theatre_id?: string
        }
        Update: {
          done_at?: string
          done_by?: string | null
          id?: string
          performance_prop_id?: string
          show_list_id?: string
          stage?: string
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_list_checks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_checks_performance_prop_id_fkey"
            columns: ["performance_prop_id"]
            isOneToOne: false
            referencedRelation: "performance_props"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_checks_show_list_id_fkey"
            columns: ["show_list_id"]
            isOneToOne: false
            referencedRelation: "show_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_checks_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      show_list_reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          performance_prop_id: string | null
          resolved_at: string | null
          scene_number: number | null
          show_list_id: string
          theatre_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          performance_prop_id?: string | null
          resolved_at?: string | null
          scene_number?: number | null
          show_list_id: string
          theatre_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          performance_prop_id?: string | null
          resolved_at?: string | null
          scene_number?: number | null
          show_list_id?: string
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_list_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_reports_performance_prop_id_fkey"
            columns: ["performance_prop_id"]
            isOneToOne: false
            referencedRelation: "performance_props"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_reports_show_list_id_fkey"
            columns: ["show_list_id"]
            isOneToOne: false
            referencedRelation: "show_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_list_reports_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      show_lists: {
        Row: {
          cast: string | null
          created_at: string
          id: string
          kind: string
          live_act_started_at: string | null
          live_scene_number: number | null
          live_updated_by: string | null
          note: string | null
          performance_id: string
          show_date: string
          theatre_id: string
          title: string | null
          venue: string | null
          with_props: boolean
        }
        Insert: {
          cast?: string | null
          created_at?: string
          id?: string
          kind?: string
          live_act_started_at?: string | null
          live_scene_number?: number | null
          live_updated_by?: string | null
          note?: string | null
          performance_id: string
          show_date: string
          theatre_id?: string
          title?: string | null
          venue?: string | null
          with_props?: boolean
        }
        Update: {
          cast?: string | null
          created_at?: string
          id?: string
          kind?: string
          live_act_started_at?: string | null
          live_scene_number?: number | null
          live_updated_by?: string | null
          note?: string | null
          performance_id?: string
          show_date?: string
          theatre_id?: string
          title?: string | null
          venue?: string | null
          with_props?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "show_lists_live_updated_by_fkey"
            columns: ["live_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_lists_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_lists_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      theatre_counters: {
        Row: {
          kind: string
          last_value: number
          theatre_id: string
        }
        Insert: {
          kind: string
          last_value?: number
          theatre_id: string
        }
        Update: {
          kind?: string
          last_value?: number
          theatre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theatre_counters_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      theatre_invites: {
        Row: {
          attempts: number
          code_enc: string
          code_mac: string
          created_at: string
          created_by: string | null
          expires_at: string
          locked_at: string | null
          theatre_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_enc: string
          code_mac: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          locked_at?: string | null
          theatre_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_enc?: string
          code_mac?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          locked_at?: string | null
          theatre_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theatre_invites_theatre_id_user_id_fkey"
            columns: ["theatre_id", "user_id"]
            isOneToOne: true
            referencedRelation: "theatre_members"
            referencedColumns: ["theatre_id", "user_id"]
          },
        ]
      }
      theatre_member_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: number
          previous_role: string | null
          role: string | null
          theatre_id: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: never
          previous_role?: string | null
          role?: string | null
          theatre_id: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: never
          previous_role?: string | null
          role?: string | null
          theatre_id?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theatre_member_events_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
        ]
      }
      theatre_members: {
        Row: {
          created_at: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          theatre_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          theatre_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          theatre_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theatre_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theatre_members_theatre_id_fkey"
            columns: ["theatre_id"]
            isOneToOne: false
            referencedRelation: "theatres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theatre_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      theatres: {
        Row: {
          ai_budget_usd: number
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          ai_budget_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          ai_budget_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_searchable_entities: {
        Row: {
          description: string | null
          embedding_context: string | null
          embedding_identity: string | null
          embedding_physical: string | null
          entity_type: string | null
          id: string | null
          image_url: string | null
          metadata: Json | null
          name: string | null
          theatre_id: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_theatre_id: { Args: never; Returns: string }
      ai_budget_status: {
        Args: never
        Returns: {
          budget_usd: number
          spent_usd: number
        }[]
      }
      calculate_test_metrics: {
        Args: { test_run_id: string }
        Returns: {
          accuracy_at_1: number
          accuracy_at_10: number
          accuracy_at_5: number
          average_rank: number
          mean_reciprocal_rank: number
          successful_queries: number
          total_queries: number
        }[]
      }
      complete_invite: { Args: { p_full_name: string }; Returns: undefined }
      can_write_active_theatre: { Args: never; Returns: boolean }
      get_intent_classification_stats: {
        Args: { days?: number }
        Returns: {
          date: string
          llm_fallback_count: number
          llm_percentage: number
          rule_based_count: number
          rule_percentage: number
          total_classifications: number
        }[]
      }
      get_storage_stats: {
        Args: never
        Returns: {
          category: string
          label: string
          size_bytes: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      is_theatre_admin: { Args: { t: string }; Returns: boolean }
      match_items: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          group_id: string
          id: string
          image_url: string
          location_id: string
          name: string
          similarity: number
        }[]
      }
      my_theatre_ids: { Args: never; Returns: string[] }
      next_storage_code: { Args: { k: string; t: string }; Returns: string }
      refresh_search_index: { Args: never; Returns: undefined }
      search_global: {
        Args: {
          fuzzy_threshold?: number
          match_count?: number
          match_threshold?: number
          query_text: string
        }
        Returns: {
          description: string
          entity_type: string
          id: string
          image_url: string
          match_type: string
          metadata: Json
          name: string
          score: number
          url: string
        }[]
      }
      search_global_direct: {
        Args: {
          fuzzy_threshold?: number
          match_count?: number
          match_threshold?: number
          query_text: string
        }
        Returns: {
          description: string
          entity_type: string
          id: string
          image_url: string
          match_type: string
          metadata: Json
          name: string
          score: number
          url: string
        }[]
      }
      search_global_hybrid: {
        Args: {
          fuzzy_threshold?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          description: string
          entity_type: string
          id: string
          image_url: string
          match_type: string
          metadata: Json
          name: string
          score: number
          url: string
        }[]
      }
      search_global_hybrid_mv: {
        Args: {
          fuzzy_threshold?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          weight_context?: number
          weight_identity?: number
          weight_physical?: number
        }
        Returns: {
          description: string
          entity_type: string
          id: string
          image_url: string
          match_type: string
          metadata: Json
          name: string
          score: number
          url: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_item: { Args: { item_uuid: string }; Returns: undefined }
      theatre_team: {
        Args: { t: string }
        Returns: {
          email: string
          full_name: string
          invited_at: string
          invited_by_name: string
          joined_at: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
    }
    Enums: {
      item_performance_status_enum:
        | "active"
        | "upcoming"
        | "archived"
        | "unassigned"
        | "in_maintenance"
      item_status_enum: "draft" | "active"
      location_type_enum: "main_storage" | "backstage" | "stage" | "other"
      mention_type: "item" | "category" | "location" | "user" | "date"
      performance_status_enum: "active" | "upcoming" | "archived"
      user_role: "admin" | "user" | "manager"
      user_status: "pending" | "approved" | "rejected"
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
      item_performance_status_enum: [
        "active",
        "upcoming",
        "archived",
        "unassigned",
        "in_maintenance",
      ],
      item_status_enum: ["draft", "active"],
      location_type_enum: ["main_storage", "backstage", "stage", "other"],
      mention_type: ["item", "category", "location", "user", "date"],
      performance_status_enum: ["active", "upcoming", "archived"],
      user_role: ["admin", "user", "manager"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const

