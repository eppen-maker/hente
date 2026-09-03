/**
 * Seeds realistic demo data.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Running it again replaces the demo clubs — it never touches other data.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateOrderFinancials } from "../src/lib/finance";
import { randomCode, sellerSlug, slugify } from "../src/lib/slug";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "sorkyst2026";

const PRICING = { retailPriceIncVat: 19_900, clubEarningPerUnit: 8_000, vatRateBp: 2_500 };

// Deterministic PRNG so repeated seeds produce the same demo numbers.
let seed = 20260901;
function random(): number {
  seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
  return seed / 4_294_967_296;
}
const pickOne = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];

const FIRST_NAMES = ["Johannes", "Espen", "Malin", "Ingrid", "Sander", "Thea", "Mathias", "Nora", "Jonas", "Emilie", "Kristian", "Hedda"];
const LAST_NAMES = ["Hansen", "Sørensen", "Olsen", "Berg", "Nilsen", "Kristiansen", "Dahl", "Lie", "Haugen", "Moen"];
const CUSTOMERS = ["Kari Olsen", "Per Hansen", "Anne Olsen", "Bjørn Lie", "Marit Berg", "Tor Nilsen", "Silje Dahl", "Ole Moen", "Hanne Vik", "Geir Aas"];

async function upsertUser(email: string, firstName: string, lastName: string, role: string) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, role },
  });

  let authUserId = created?.user?.id;
  if (error && !authUserId) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    authUserId = list?.users.find((u) => u.email === email)?.id;
  }
  if (!authUserId) throw new Error(`Could not create or find user ${email}: ${error?.message}`);

  const { data: profile } = await supabase
    .from("profiles")
    .upsert({ auth_user_id: authUserId, email, first_name: firstName, last_name: lastName, role }, { onConflict: "auth_user_id" })
    .select("id")
    .single();

  return { authUserId, profileId: profile!.id as string };
}

async function createClub(client: SupabaseClient, name: string, city: string) {
  const { data, error } = await client
    .from("clubs")
    .insert({
      name,
      slug: slugify(name),
      organisation_number: String(910_000_000 + Math.floor(random() * 89_999_999)),
      contact_name: "Dugnadsansvarlig",
      contact_email: `post@${slugify(name).replace(/-/g, "")}.no`,
      contact_phone: "38000000",
      address: "Idrettsveien 1",
      postal_code: "4640",
      city,
    })
    .select("id, name, slug")
    .single();
  if (error) throw error;
  return data;
}

async function createTeams(clubId: string, names: string[]) {
  const { data, error } = await supabase
    .from("teams")
    .insert(names.map((name) => ({ club_id: clubId, name, slug: slugify(name), season: "2026" })))
    .select("id, name, slug");
  if (error) throw error;
  return data!;
}

async function createCampaign(clubId: string, name: string, targetQuantity: number, pickupLocation: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      club_id: clubId,
      name,
      slug: slugify(name),
      description: "Dugnad for SØRKYST håndsåpe refill, 500 ml.",
      start_date: "2026-09-01",
      end_date: "2026-10-10",
      sales_target_quantity: targetQuantity,
      sales_target_amount: targetQuantity * PRICING.retailPriceIncVat,
      retail_price_inc_vat: PRICING.retailPriceIncVat,
      club_earning_per_unit: PRICING.clubEarningPerUnit,
      vat_rate_bp: PRICING.vatRateBp,
      status: "ACTIVE",
      pickup_location: pickupLocation,
      pickup_date: "2026-10-14",
      leaderboard_enabled: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function createSeller(args: {
  campaignId: string;
  teamId: string;
  firstName: string;
  lastName: string;
  profileId?: string | null;
  target?: number;
}) {
  const { data, error } = await supabase
    .from("sellers")
    .insert({
      campaign_id: args.campaignId,
      team_id: args.teamId,
      profile_id: args.profileId ?? null,
      first_name: args.firstName,
      last_name: args.lastName,
      slug: sellerSlug(args.firstName, args.lastName),
      seller_code: randomCode(6),
      sales_target: args.target ?? 5,
      phone: null,
      email: null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function createPaidOrder(args: {
  campaignId: string;
  clubId: string;
  teamId: string;
  sellerId: string;
  customerName: string;
  quantity: number;
  delivered?: boolean;
  daysAgo?: number;
}) {
  const f = calculateOrderFinancials(args.quantity, PRICING);
  const createdAt = new Date(Date.now() - (args.daysAgo ?? Math.floor(random() * 20)) * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      campaign_id: args.campaignId,
      club_id: args.clubId,
      team_id: args.teamId,
      seller_id: args.sellerId,
      customer_name: args.customerName,
      customer_phone: `479${String(Math.floor(random() * 9_000_000) + 1_000_000)}`,
      customer_email: null,
      quantity: args.quantity,
      unit_price_inc_vat: PRICING.retailPriceIncVat,
      gross_amount: f.grossAmount,
      club_earning_amount: f.clubEarningAmount,
      sorkyst_amount_inc_vat: f.sorkystAmountIncVat,
      vat_amount: f.vatAmount,
      sorkyst_revenue_ex_vat: f.sorkystRevenueExVat,
      vat_rate_bp: PRICING.vatRateBp,
      payment_provider: "mock",
      payment_reference: `mock_seed_${randomCode(8)}`,
      payment_status: "CAPTURED",
      status: "PAID",
      created_at: createdAt,
      paid_at: createdAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("payments").insert({
    order_id: data!.id,
    provider: "mock",
    provider_payment_id: `mock_seed_${data!.id}`,
    provider_reference: data!.id,
    amount: f.grossAmount,
    currency: "NOK",
    status: "CAPTURED",
    raw_response: { seeded: true },
  });

  await supabase.from("order_deliveries").insert({
    order_id: data!.id,
    seller_id: args.sellerId,
    status: args.delivered ? "DELIVERED" : "NOT_DELIVERED",
    delivered_at: args.delivered ? createdAt : null,
  });

  return data!.id as string;
}

async function main() {
  console.log("Seeding SØRKYST demo data…");

  // Demo clubs are recreated from scratch; cascades remove their teams/campaigns/orders.
  await supabase.from("clubs").delete().in("slug", ["sogne-fk", "vag-fk"]);

  const admin = await upsertUser("admin@sorkyst.no", "Ida", "Kristiansen", "SORKYST_ADMIN");
  const clubAdmin = await upsertUser("klubb@sognefk.no", "Trond", "Berg", "CLUB_ADMIN");
  const sellerUser = await upsertUser("johannes@example.com", "Johannes", "Hansen", "SELLER");

  // ---------------------------------------------------------------- Søgne FK
  const sogne = await createClub(supabase, "Søgne FK", "Søgne");
  const sogneTeams = await createTeams(sogne.id, ["G2013", "J2013", "G2014", "J2014"]);
  const sogneCampaign = await createCampaign(sogne.id, "Høstdugnad 2026", 2_000, "Klubbhuset, Søgne stadion");

  await supabase.from("club_admins").insert({ profile_id: clubAdmin.profileId, club_id: sogne.id });
  await supabase
    .from("campaign_teams")
    .insert(sogneTeams.map((team) => ({ campaign_id: sogneCampaign, team_id: team.id })));

  const g2013 = sogneTeams.find((t) => t.name === "G2013")!;

  const johannes = await createSeller({
    campaignId: sogneCampaign,
    teamId: g2013.id,
    firstName: "Johannes",
    lastName: "Hansen",
    profileId: sellerUser.profileId,
    target: 5,
  });

  await createPaidOrder({ campaignId: sogneCampaign, clubId: sogne.id, teamId: g2013.id, sellerId: johannes, customerName: "Kari Olsen", quantity: 2, delivered: false, daysAgo: 8 });
  await createPaidOrder({ campaignId: sogneCampaign, clubId: sogne.id, teamId: g2013.id, sellerId: johannes, customerName: "Per Hansen", quantity: 1, delivered: true, daysAgo: 6 });
  await createPaidOrder({ campaignId: sogneCampaign, clubId: sogne.id, teamId: g2013.id, sellerId: johannes, customerName: "Anne Olsen", quantity: 3, delivered: false, daysAgo: 3 });

  let sogneOrders = 3;
  for (const team of sogneTeams) {
    const sellerCount = team.name === "G2013" ? 7 : 6;
    for (let i = 0; i < sellerCount; i += 1) {
      const sellerId = await createSeller({
        campaignId: sogneCampaign,
        teamId: team.id,
        firstName: pickOne(FIRST_NAMES),
        lastName: pickOne(LAST_NAMES),
        target: 5,
      });
      const orders = Math.floor(random() * 6);
      for (let o = 0; o < orders; o += 1) {
        await createPaidOrder({
          campaignId: sogneCampaign,
          clubId: sogne.id,
          teamId: team.id,
          sellerId,
          customerName: pickOne(CUSTOMERS),
          quantity: 1 + Math.floor(random() * 4),
          delivered: random() > 0.7,
        });
        sogneOrders += 1;
      }
    }
  }

  // ---------------------------------------------------------------- Våg FK
  const vag = await createClub(supabase, "Våg FK", "Kristiansand");
  const vagTeams = await createTeams(vag.id, ["G2012", "G2013", "J2012"]);
  const vagCampaign = await createCampaign(vag.id, "Vårdugnad 2026", 3_000, "Vågshallen");
  await supabase.from("campaign_teams").insert(vagTeams.map((team) => ({ campaign_id: vagCampaign, team_id: team.id })));

  let vagOrders = 0;
  for (const team of vagTeams) {
    for (let i = 0; i < 8; i += 1) {
      const sellerId = await createSeller({
        campaignId: vagCampaign,
        teamId: team.id,
        firstName: pickOne(FIRST_NAMES),
        lastName: pickOne(LAST_NAMES),
        target: 8,
      });
      const orders = 1 + Math.floor(random() * 7);
      for (let o = 0; o < orders; o += 1) {
        await createPaidOrder({
          campaignId: vagCampaign,
          clubId: vag.id,
          teamId: team.id,
          sellerId,
          customerName: pickOne(CUSTOMERS),
          quantity: 1 + Math.floor(random() * 5),
          delivered: random() > 0.8,
        });
        vagOrders += 1;
      }
    }
  }

  await supabase.from("audit_log").insert({
    actor_user_id: admin.profileId,
    action: "seed.completed",
    entity_type: "system",
    metadata: { sogneOrders, vagOrders },
  });

  console.log(`
Done.

  Søgne FK  — Høstdugnad 2026 (${sogneOrders} ordrer)
  Våg FK    — Vårdugnad 2026 (${vagOrders} ordrer)

  Logg inn (passord: ${DEMO_PASSWORD})
    admin@sorkyst.no      SØRKYST admin  -> /admin
    klubb@sognefk.no      Klubbadmin     -> /club
    johannes@example.com  Selger         -> /seller

  Johannes' salgsside: /s/sogne-fk/g2013/johannes-hansen
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
