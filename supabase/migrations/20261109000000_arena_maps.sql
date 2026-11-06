-- 20261109000000_arena_maps.sql — Arena PvP, fase P5: tableros justos.
-- Plan: docs/PLAN_ARENA_PVP.md, sección 16. Depende de 20261106000000_arena_pvp.sql.
--
-- La lista de mapas de la Arena pasa a ser la de los tableros justos para los dos bandos:
--   · 2 mapas originales que ya eran simétricos con un giro de media vuelta: forest_maple_glade y genesis_royal_garden
--     (genesis_sanctum_gate también lo es, pero en las partidas simuladas daba ventaja al bando A y quien juega
--     primero ganaba el 64 %);
--   · 5 versiones espejo nuevas (`pvp_…`, solo para la Arena). Fuera: forest_river_ford (ninguna versión espejo
--     quedó equilibrada) y pvp_mystic_crystal_isles (ventaja del bando B en las partidas simuladas).
-- Medidas y partidas simuladas: tools/pvp/map-fairness.mjs. Las partidas ya creadas conservan su mapa.
-- El resto de ajustes, igual que en 20261106000000_arena_pvp.sql.

create or replace function public.pvp_settings()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'tz', 'America/Bogota',
    'start_points', 1000,
    'k_new', 32, 'k_new_games', 20, 'k', 24,
    'min_win', 10, 'max_loss', 30,
    'same_rival_per_day', 3,
    'slp_win', 15, 'slp_wins_per_day', 10,
    'board_size', 10,
    'payout', jsonb_build_array(30, 20, 15, 10, 10, 5, 5, 5, 5, 5),
    'queue_window', 100, 'queue_step', 100, 'queue_step_secs', 15, 'queue_any_secs', 60, 'queue_ttl_secs', 120,
    'turn_secs', 45, 'turn_grace_secs', 5, 'abandon_secs', 180, 'report_wait_secs', 120,
    'max_rounds', 25,
    'max_actions', 3000,
    -- Lista PvP (fase P5): tableros simétricos con un giro de 180° y equilibrados en las partidas simuladas
    'maps', jsonb_build_array('forest_maple_glade', 'genesis_royal_garden',
      'pvp_savannah_oasis', 'pvp_savannah_canyon', 'pvp_arctic_glacier_pass', 'pvp_arctic_boreal_camp',
      'pvp_mystic_glow_swamp'),
    'sapidae_classes', jsonb_build_array('crafter', 'shepard', 'lunalogist', 'stargazer')
  );
$$;
revoke all on function public.pvp_settings() from public;
grant execute on function public.pvp_settings() to anon, authenticated, service_role;
