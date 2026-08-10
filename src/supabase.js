import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lnxfltmqphmcpffhcywp.supabase.co";

const supabaseKey =
  "sb_publishable_eeqJDXnNpIIEP4PEc2Ze3w_W9mM6kuQ";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);