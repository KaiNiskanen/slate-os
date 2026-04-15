-- Keep OpenClaw create idempotent while still enriching existing leads.
create or replace function public.create_lead_if_not_exists(
  p_company text,
  p_contact text,
  p_email text default null,
  p_niche text default null,
  p_website_url text default null,
  p_notes text default null,
  p_source text default 'openclaw'
)
returns table(status text, lead_id uuid, company text, contact text)
language plpgsql
as $function$
declare
  v_contact_norm text;
  v_email_norm text;
  v_website_domain_norm text;
  v_inserted_id uuid;
  v_inserted_company text;
  v_inserted_contact text;
  v_existing_id uuid;
  v_existing_company text;
  v_existing_contact text;
  v_actor_type text;
begin
  if coalesce(btrim(p_company), '') = '' then
    raise exception 'Company is required.';
  end if;

  v_contact_norm := public.normalize_contact_identity(p_contact);

  if v_contact_norm is null then
    raise exception 'Contact is required.';
  end if;

  v_email_norm := public.normalize_email_identity(p_email);
  v_website_domain_norm := public.normalize_website_domain(p_website_url);
  v_actor_type := case when p_source = 'openclaw' then 'openclaw' else 'system' end;

  insert into public.leads as target (
    company,
    contact,
    contact_norm,
    status,
    email,
    email_norm,
    niche,
    website_url,
    website_domain_norm,
    notes,
    source
  )
  values (
    btrim(p_company),
    btrim(p_contact),
    v_contact_norm,
    'new',
    nullif(btrim(coalesce(p_email, '')), ''),
    v_email_norm,
    nullif(btrim(coalesce(p_niche, '')), ''),
    nullif(btrim(coalesce(p_website_url, '')), ''),
    v_website_domain_norm,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_source
  )
  on conflict (contact_norm) do nothing
  returning target.id, target.company, target.contact
  into v_inserted_id, v_inserted_company, v_inserted_contact;

  if v_inserted_id is not null then
    insert into public.lead_events (lead_id, event_type, payload_json, actor_type)
    values (
      v_inserted_id,
      'created',
      jsonb_build_object('source', p_source),
      v_actor_type
    );

    return query
    select 'created'::text, v_inserted_id, v_inserted_company, v_inserted_contact;
    return;
  end if;

  -- Only fill blanks on deduped leads so OpenClaw can enrich without clobbering data.
  update public.leads as existing
  set
    email = case
      when coalesce(btrim(existing.email), '') = '' then nullif(btrim(coalesce(p_email, '')), '')
      else existing.email
    end,
    email_norm = case
      when coalesce(btrim(existing.email), '') = ''
        and nullif(btrim(coalesce(p_email, '')), '') is not null then v_email_norm
      else existing.email_norm
    end,
    niche = case
      when coalesce(btrim(existing.niche), '') = '' then nullif(btrim(coalesce(p_niche, '')), '')
      else existing.niche
    end,
    website_url = case
      when coalesce(btrim(existing.website_url), '') = '' then nullif(btrim(coalesce(p_website_url, '')), '')
      else existing.website_url
    end,
    website_domain_norm = case
      when coalesce(btrim(existing.website_url), '') = ''
        and nullif(btrim(coalesce(p_website_url, '')), '') is not null then v_website_domain_norm
      else existing.website_domain_norm
    end,
    notes = case
      when coalesce(btrim(existing.notes), '') = '' then nullif(btrim(coalesce(p_notes, '')), '')
      else existing.notes
    end
  where existing.contact_norm = v_contact_norm
  returning existing.id, existing.company, existing.contact
  into v_existing_id, v_existing_company, v_existing_contact;

  return query
  select 'existing'::text, v_existing_id, v_existing_company, v_existing_contact;
end;
$function$;
