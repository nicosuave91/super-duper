DO $$
DECLARE
  v_site_id uuid := '1a2907b5-ca91-4cb1-8da8-5bcfa0966035';
BEGIN

  INSERT INTO leads (
    site_id,
    created_at,
    first_name,
    last_name,
    email,
    phone,
    state,
    payload,

    -- v2 columns (if present in your schema)
    updated_at,
    status,
    sub_status,
    status_updated_at,
    type,
    full_name,
    full_name_normalized,
    email_normalized,
    phone_e164,
    dob,
    priority_score,
    priority_reason,
    estimated_monthly_premium,
    estimated_commission,
    next_action_type,
    next_action_at,
    last_activity_at,
    last_activity_type,
    source_page,
    consent_status,
    consent_updated_at,
    archived_at,
    version
  )
  VALUES
  -- 1
  (v_site_id, now() - interval '2 hours', 'James', 'Carter', 'james.carter@example.com', '(804) 555-0101', 'VA', '{}'::jsonb,
   now(), 'new', null, now() - interval '2 hours', 'term', 'James Carter', 'james carter', 'james.carter@example.com', '+18045550101', date '1987-05-14',
   92, '{"factors":["recent_submit","good_age","high_intent"]}'::jsonb, 145.00, 65.00, 'call', now() - interval '10 minutes',
   now() - interval '2 hours', 'form_submit', 'mortgage_protection', 'consented', now() - interval '2 hours', null, 1),

  -- 2
  (v_site_id, now() - interval '5 hours', 'Maria', 'Lopez', 'maria.lopez@example.com', '(804) 555-0102', 'VA', '{}'::jsonb,
   now(), 'contacted', 'texted', now() - interval '3 hours', 'iul', 'Maria Lopez', 'maria lopez', 'maria.lopez@example.com', '+18045550102', date '1991-11-02',
   81, '{"factors":["responded_sms","mid_premium","good_state"]}'::jsonb, 120.00, 55.00, 'text', now() + interval '2 hours',
   now() - interval '1 hour', 'sms_inbound', 'life_insurance', 'consented', now() - interval '5 hours', null, 1),

  -- 3
  (v_site_id, now() - interval '1 day', 'Derek', 'Nguyen', 'derek.nguyen@example.com', '(804) 555-0103', 'NC', '{}'::jsonb,
   now(), 'quoted', 'follow_up', now() - interval '20 hours', 'term', 'Derek Nguyen', 'derek nguyen', 'derek.nguyen@example.com', '+18045550103', date '1982-03-09',
   76, '{"factors":["quote_generated","needs_follow_up","good_age"]}'::jsonb, 210.00, 90.00, 'call', now() + interval '1 day',
   now() - interval '20 hours', 'quote_generated', 'term', 'consented', now() - interval '1 day', null, 1),

  -- 4
  (v_site_id, now() - interval '3 days', 'Alicia', 'Brown', 'alicia.brown@example.com', '(804) 555-0104', 'SC', '{}'::jsonb,
   now(), 'app_started', null, now() - interval '2 days', 'annuity', 'Alicia Brown', 'alicia brown', 'alicia.brown@example.com', '+18045550104', date '1974-07-21',
   69, '{"factors":["app_started","older_age","higher_value"]}'::jsonb, 260.00, 110.00, 'review', now() + interval '3 hours',
   now() - interval '2 days', 'status_change', 'retirement', 'consented', now() - interval '3 days', null, 1),

  -- 5
  (v_site_id, now() - interval '6 days', 'Brandon', 'Hall', 'brandon.hall@example.com', '(804) 555-0105', 'VA', '{}'::jsonb,
   now(), 'submitted', null, now() - interval '5 days', 'term', 'Brandon Hall', 'brandon hall', 'brandon.hall@example.com', '+18045550105', date '1996-02-18',
   84, '{"factors":["submitted_app","recent_activity","mid_value"]}'::jsonb, 175.00, 75.00, 'review', now() + interval '1 day',
   now() - interval '5 days', 'status_change', 'debt_free_life', 'consented', now() - interval '6 days', null, 1),

  -- 6
  (v_site_id, now() - interval '8 days', 'Helen', 'Young', 'helen.young@example.com', '(804) 555-0106', 'GA', '{}'::jsonb,
   now(), 'issued', null, now() - interval '7 days', 'term', 'Helen Young', 'helen young', 'helen.young@example.com', '+18045550106', date '1979-10-05',
   73, '{"factors":["issued","high_value","good_state"]}'::jsonb, 310.00, 140.00, 'review', null,
   now() - interval '7 days', 'status_change', 'life_insurance', 'consented', now() - interval '8 days', null, 1),

  -- 7
  (v_site_id, now() - interval '10 days', 'Caleb', 'Turner', 'caleb.turner@example.com', '(804) 555-0107', 'VA', '{}'::jsonb,
   now(), 'lost', 'not_qualified', now() - interval '9 days', 'term', 'Caleb Turner', 'caleb turner', 'caleb.turner@example.com', '+18045550107', date '1963-12-12',
   22, '{"factors":["bad_fit","declined_health","no_response"]}'::jsonb, 0.00, 0.00, 'review', null,
   now() - interval '9 days', 'status_change', 'mortgage_protection', 'unknown', now() - interval '10 days', null, 1),

  -- 8
  (v_site_id, now() - interval '12 days', 'Sofia', 'Martinez', 'sofia.martinez@example.com', '(804) 555-0108', 'FL', '{}'::jsonb,
   now(), 'contacted', 'left_vm', now() - interval '11 days', 'iul', 'Sofia Martinez', 'sofia martinez', 'sofia.martinez@example.com', '+18045550108', date '1989-09-29',
   58, '{"factors":["vm_left","no_reply","ok_age"]}'::jsonb, 135.00, 60.00, 'call', now() + interval '6 hours',
   now() - interval '11 days', 'call_outbound', 'life_insurance', 'consented', now() - interval '12 days', null, 1),

  -- 9
  (v_site_id, now() - interval '14 days', 'Tyler', 'Wilson', 'tyler.wilson@example.com', '(804) 555-0109', 'TN', '{}'::jsonb,
   now(), 'new', null, now() - interval '14 days', 'term', 'Tyler Wilson', 'tyler wilson', 'tyler.wilson@example.com', '+18045550109', date '1999-04-03',
   67, '{"factors":["recent_submit","young_age","good_intent"]}'::jsonb, 95.00, 40.00, 'text', now() + interval '4 hours',
   now() - interval '14 days', 'form_submit', 'smartstart', 'consented', now() - interval '14 days', null, 1),

  -- 10
  (v_site_id, now() - interval '16 days', 'Priya', 'Patel', 'priya.patel@example.com', '(804) 555-0110', 'VA', '{}'::jsonb,
   now(), 'quoted', 'no_answer', now() - interval '15 days', 'annuity', 'Priya Patel', 'priya patel', 'priya.patel@example.com', '+18045550110', date '1971-06-11',
   79, '{"factors":["quote_generated","higher_value","no_contact"]}'::jsonb, 240.00, 105.00, 'call', now() + interval '2 days',
   now() - interval '15 days', 'quote_generated', 'retirement', 'consented', now() - interval '16 days', null, 1),

  -- 11
  (v_site_id, now() - interval '18 days', 'Noah', 'Reed', 'noah.reed@example.com', '(804) 555-0111', 'VA', '{}'::jsonb,
   now(), 'contacted', 'follow_up', now() - interval '17 days', 'term', 'Noah Reed', 'noah reed', 'noah.reed@example.com', '+18045550111', date '1985-01-23',
   61, '{"factors":["contacted","needs_follow_up","ok_value"]}'::jsonb, 160.00, 70.00, 'call', now() + interval '1 day',
   now() - interval '17 days', 'sms_sent', 'life_insurance', 'consented', now() - interval '18 days', null, 1),

  -- 12
  (v_site_id, now() - interval '20 days', 'Emma', 'King', 'emma.king@example.com', '(804) 555-0112', 'KY', '{}'::jsonb,
   now(), 'app_started', 'postponed', now() - interval '19 days', 'iul', 'Emma King', 'emma king', 'emma.king@example.com', '+18045550112', date '1993-08-15',
   54, '{"factors":["app_started","postponed","mid_intent"]}'::jsonb, 130.00, 58.00, 'text', now() + interval '3 days',
   now() - interval '19 days', 'status_change', 'term', 'consented', now() - interval '20 days', null, 1),

  -- 13
  (v_site_id, now() - interval '22 days', 'Liam', 'Evans', 'liam.evans@example.com', '(804) 555-0113', 'VA', '{}'::jsonb,
   now(), 'submitted', null, now() - interval '21 days', 'term', 'Liam Evans', 'liam evans', 'liam.evans@example.com', '+18045550113', date '1988-04-25',
   71, '{"factors":["submitted_app","mid_value","good_state"]}'::jsonb, 185.00, 80.00, 'review', now() + interval '1 day',
   now() - interval '21 days', 'status_change', 'mortgage_protection', 'consented', now() - interval '22 days', null, 1),

  -- 14
  (v_site_id, now() - interval '24 days', 'Grace', 'Scott', 'grace.scott@example.com', '(804) 555-0114', 'AL', '{}'::jsonb,
   now(), 'new', null, now() - interval '24 days', 'annuity', 'Grace Scott', 'grace scott', 'grace.scott@example.com', '+18045550114', date '1968-09-08',
   48, '{"factors":["older_age","no_touch","unknown_intent"]}'::jsonb, 220.00, 98.00, 'call', now() - interval '2 hours',
   now() - interval '24 days', 'form_submit', 'retirement', 'unknown', now() - interval '24 days', null, 1),

  -- 15
  (v_site_id, now() - interval '26 days', 'Ethan', 'Price', 'ethan.price@example.com', '(804) 555-0115', 'VA', '{}'::jsonb,
   now(), 'contacted', 'no_answer', now() - interval '25 days', 'term', 'Ethan Price', 'ethan price', 'ethan.price@example.com', '+18045550115', date '1990-12-30',
   57, '{"factors":["no_answer","mid_value","ok_age"]}'::jsonb, 150.00, 66.00, 'call', now() + interval '5 hours',
   now() - interval '25 days', 'call_outbound', 'life_insurance', 'consented', now() - interval '26 days', null, 1),

  -- 16
  (v_site_id, now() - interval '28 days', 'Olivia', 'Gray', 'olivia.gray@example.com', '(804) 555-0116', 'MS', '{}'::jsonb,
   now(), 'quoted', 'declined', now() - interval '27 days', 'iul', 'Olivia Gray', 'olivia gray', 'olivia.gray@example.com', '+18045550116', date '1980-02-06',
   33, '{"factors":["declined_quote","low_intent","no_follow_up"]}'::jsonb, 0.00, 0.00, 'review', null,
   now() - interval '27 days', 'status_change', 'term', 'opted_out', now() - interval '28 days', null, 1),

  -- 17
  (v_site_id, now() - interval '30 days', 'Mason', 'Hughes', 'mason.hughes@example.com', '(804) 555-0117', 'VA', '{}'::jsonb,
   now(), 'issued', null, now() - interval '29 days', 'term', 'Mason Hughes', 'mason hughes', 'mason.hughes@example.com', '+18045550117', date '1976-03-19',
   78, '{"factors":["issued","high_value","good_state"]}'::jsonb, 290.00, 130.00, 'review', null,
   now() - interval '29 days', 'status_change', 'mortgage_protection', 'consented', now() - interval '30 days', null, 1),

  -- 18
  (v_site_id, now() - interval '32 days', 'Chloe', 'Bennett', 'chloe.bennett@example.com', '(804) 555-0118', 'GA', '{}'::jsonb,
   now(), 'submitted', 'follow_up', now() - interval '31 days', 'annuity', 'Chloe Bennett', 'chloe bennett', 'chloe.bennett@example.com', '+18045550118', date '1972-11-11',
   66, '{"factors":["submitted_app","needs_follow_up","high_value"]}'::jsonb, 255.00, 115.00, 'call', now() + interval '2 days',
   now() - interval '31 days', 'status_change', 'retirement', 'consented', now() - interval '32 days', null, 1),

  -- 19
  (v_site_id, now() - interval '34 days', 'Ava', 'Collins', 'ava.collins@example.com', '(804) 555-0119', 'VA', '{}'::jsonb,
   now(), 'new', null, now() - interval '34 days', 'iul', 'Ava Collins', 'ava collins', 'ava.collins@example.com', '+18045550119', date '1994-01-17',
   74, '{"factors":["young_age","good_intent","no_touch"]}'::jsonb, 110.00, 50.00, 'text', now() + interval '1 hour',
   now() - interval '34 days', 'form_submit', 'life_insurance', 'consented', now() - interval '34 days', null, 1),

  -- 20
  (v_site_id, now() - interval '36 days', 'Jackson', 'Brooks', 'jackson.brooks@example.com', '(804) 555-0120', 'NC', '{}'::jsonb,
   now(), 'archived', null, now() - interval '35 days', 'term', 'Jackson Brooks', 'jackson brooks', 'jackson.brooks@example.com', '+18045550120', date '1969-04-28',
   15, '{"factors":["archived","no_response","stale"]}'::jsonb, 0.00, 0.00, 'review', null,
   now() - interval '35 days', 'status_change', 'mortgage_protection', 'unknown', now() - interval '36 days', now() - interval '1 day', 1);

END $$;
