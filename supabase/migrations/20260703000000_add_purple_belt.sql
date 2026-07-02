-- Insert Purple Belt (4th Kyu) between Blue Belt (5th Kyu) and Brown Belt.
-- This shifts Brown Belt and every Dan rank up by one order_index.
--
-- order_index is UNIQUE, and a naive `+ 1` UPDATE checks the constraint
-- per-row and can spuriously collide. We sidestep that by parking the
-- affected rows at a high offset first, inserting Purple, then bringing
-- them back down to their final positions. Guarded so re-runs are no-ops.

do $$
begin
  if not exists (select 1 from belt_ranks where name = 'Purple Belt') then
    -- Park Brown + all Dan ranks well out of the way.
    update belt_ranks set order_index = order_index + 100 where order_index >= 5;

    -- Slot Purple Belt into the freed-up position 5.
    insert into belt_ranks (name, kyu_dan, color_hex, order_index, updated_at)
      values ('Purple Belt', '4th Kyu', '#7C3AED', 5, now());

    -- Bring the parked rows back, now one position higher than before.
    update belt_ranks set order_index = order_index - 99 where order_index >= 105;
  end if;
end $$;
