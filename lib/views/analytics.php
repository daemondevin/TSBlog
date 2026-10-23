<?php defined('TS_ROOT') or exit(); // Variables: $r (report), $days, $titles, $csrf
$ipsOn = TSAnalytics::ipMode() !== 'none';
$title = fn($p) => $p === '/' ? 'Home' : (isset($titles[ltrim($p, '/')]) ? $titles[ltrim($p, '/')] : $p);
$n = fn($x) => number_format((int) $x);
$short = fn($u) => mb_strlen($u) > 70 ? mb_substr($u, 0, 69) . '…' : $u;
$rows = function (array $items, int $total, callable $label = null, int $max = 10) {
    $o = '';
    foreach (array_slice($items, 0, $max, true) as $k => $c) {
        $pct = $total > 0 ? round($c / $total * 100) : 0;
        $o .= '<li><span class="a-lbl">' . ($label ? $label($k) : e($k)) . '</span><span class="a-n">' . number_format($c) . '</span><span class="a-bar"><i style="width:' . $pct . '%"></i></span></li>';
    }
    return $o ?: '<li class="muted">Nothing yet.</li>';
};
$kinds = ['v' => 'View', 'c' => 'Click', 'm' => 'Not found'];
// Chart
$s = $r['series']; $dates = array_keys($s); $cnt = max(1, count($dates));
$maxV = max(1, ...array_values(array_map(fn($x) => $x["views"], $s)));
$W = 720; $H = 170; $pad = 24; $bw = ($W - 8) / $cnt;
?>
<main class="list analytics">
  <div class="list-head">
    <h1>Analytics</h1>
    <div class="a-tools">
      <a class="btn" href="<?= e(ts_url('admin/analytics/export', ['days' => $days])) ?>"><i class="fas fa-download"></i> Export CSV</a>
      <button class="btn warn" type="button" id="a-clear" data-endpoint="<?= e(ts_url('admin/analytics')) ?>" data-csrf="<?= e($csrf) ?>">Clear data</button>
    </div>
  </div>
  <?php if (!TSAnalytics::enabled()): ?><p class="alert">Analytics are turned off, so nothing new is being recorded. Turn them on under <a href="<?= e(ts_url('admin/settings')) ?>#analytics">Settings</a>.</p><?php endif; ?>
  <nav class="tabs" aria-label="Time range">
    <?php foreach ([7 => 'Last 7 days', 30 => 'Last 30 days', 90 => 'Last 90 days', 365 => 'Last year'] as $d => $label): ?>
      <a href="<?= e(ts_url('admin/analytics', ['days' => $d])) ?>"<?= $days === $d ? ' class="on" aria-current="page"' : '' ?>><?= e($label) ?></a>
    <?php endforeach; ?>
  </nav>

  <div class="a-cards">
    <div class="a-card"><span>Page views</span><strong><?= $n($r['views']) ?></strong><small><?= $n($r['todayViews']) ?> today</small></div>
    <div class="a-card"><span>Visitors</span><strong><?= $n($r['visitorCount']) ?></strong><small><?= $n($r['todayVisitorCount']) ?> today</small></div>
    <div class="a-card"><span>Link clicks</span><strong><?= $n($r['clicks']) ?></strong><small>outbound, files, email</small></div>
    <div class="a-card"><span>Not found</span><strong><?= $n($r['misses']) ?></strong><small>pages that did not exist</small></div>
  </div>
  <p class="muted a-note"><?= $n($r['bots']) ?> visit<?= $r['bots'] == 1 ? '' : 's' ?> from bots and crawlers <?= $r['bots'] == 1 ? 'was' : 'were' ?> left out of these numbers. Your own visits while signed in are never counted. “Visitors” are distinct browsers, not people.</p>

  <section class="a-panel">
    <h2>Views per day</h2>
    <svg class="a-chart" viewBox="0 0 <?= $W ?> <?= $H + $pad ?>" role="img" aria-label="Page views per day">
      <?php foreach ([0.5, 1] as $g): $y = $H - $g * ($H - 10); ?><line x1="0" x2="<?= $W ?>" y1="<?= round($y, 1) ?>" y2="<?= round($y, 1) ?>" class="a-grid"/><text x="2" y="<?= round($y - 3, 1) ?>" class="a-axis"><?= $n(round($maxV * $g)) ?></text><?php endforeach; ?>
      <?php foreach ($dates as $i => $d): $x = 4 + $i * $bw; $h = $s[$d]['views'] / $maxV * ($H - 10); $hv = $s[$d]['vis'] / $maxV * ($H - 10); ?>
        <g><title><?= e(date('D M j', strtotime($d))) ?>: <?= $n($s[$d]['views']) ?> views, <?= $n($s[$d]['vis']) ?> visitors, <?= $n($s[$d]['clicks']) ?> clicks</title>
        <rect x="<?= round($x, 2) ?>" y="0" width="<?= round($bw, 2) ?>" height="<?= $H ?>" class="a-hit"/>
        <rect x="<?= round($x + $bw * 0.12, 2) ?>" y="<?= round($H - $h, 2) ?>" width="<?= round($bw * 0.76, 2) ?>" height="<?= round($h, 2) ?>" rx="2" class="a-views"/>
        <rect x="<?= round($x + $bw * 0.12, 2) ?>" y="<?= round($H - $hv, 2) ?>" width="<?= round($bw * 0.76, 2) ?>" height="<?= round($hv, 2) ?>" rx="2" class="a-vis"/></g>
      <?php endforeach; ?>
      <text x="4" y="<?= $H + 16 ?>" class="a-axis"><?= e(date('M j', strtotime($dates[0]))) ?></text>
      <text x="<?= $W - 4 ?>" y="<?= $H + 16 ?>" class="a-axis" text-anchor="end"><?= e(date('M j', strtotime(end($dates)))) ?></text>
    </svg>
    <p class="a-legend"><i class="a-views"></i> Views <i class="a-vis"></i> Visitors</p>
  </section>

  <div class="a-grid2">
    <section class="a-panel"><h2>Top pages</h2><ul class="a-list"><?= $rows($r['pages'], $r['views'], fn($p) => e($title($p)) . ($title($p) !== $p && $p !== '/' ? ' <small class="muted">' . e($p) . '</small>' : '')) ?></ul></section>
    <section class="a-panel"><h2>Where visitors came from</h2><ul class="a-list"><?= $rows($r['refs'], $r['views']) ?></ul><p class="muted a-foot">Visits with no referrer (typed address, bookmarks, most apps) are not listed.</p></section>
  </div>

  <section class="a-panel">
    <h2>Links clicked</h2>
    <?php if ($r['links']): ?>
    <table class="a-table"><thead><tr><th>Address</th><th>Type</th><th class="num">Clicks</th><th>Clicked on</th></tr></thead><tbody>
      <?php foreach (array_slice($r['links'], 0, 25, true) as $u => $l): $from = array_keys($l['from']); ?>
      <tr><td class="a-url" title="<?= e($u) ?>"><?= e($short($u)) ?></td><td><span class="pill"><?= ['out' => 'Outbound', 'file' => 'Download', 'mail' => 'Email'][$l['ct']] ?? 'Outbound' ?></span></td><td class="num"><?= $n($l['n']) ?></td>
        <td><?= e($title($from[0])) ?><?= count($from) > 1 ? ' <span class="muted">+' . (count($from) - 1) . ' more</span>' : '' ?></td></tr>
      <?php endforeach; ?>
    </tbody></table>
    <?php else: ?><p class="muted">No clicks recorded yet. Clicks on links to other sites, downloads and email addresses are counted.</p><?php endif; ?>
  </section>

  <div class="a-grid3">
    <section class="a-panel"><h2>Browsers</h2><ul class="a-list"><?= $rows($r['br'], $r['views']) ?></ul></section>
    <section class="a-panel"><h2>Systems</h2><ul class="a-list"><?= $rows($r['os'], $r['views']) ?></ul></section>
    <section class="a-panel"><h2>Devices</h2><ul class="a-list"><?= $rows($r['dv'], $r['views']) ?></ul></section>
  </div>

  <?php if ($ipsOn): ?>
  <section class="a-panel">
    <h2>Visitor IP addresses <small class="muted"><?= TSAnalytics::ipMode() === 'masked' ? '(shortened)' : '' ?></small></h2>
    <?php if ($r['ips']): ?>
    <table class="a-table"><thead><tr><th>Address</th><th class="num">Requests</th><th>Last seen</th><th>Browser</th></tr></thead><tbody>
      <?php foreach (array_slice($r['ips'], 0, 25, true) as $ip => $d): ?>
      <tr><td class="a-mono"><?= e($ip) ?></td><td class="num"><?= $n($d['n']) ?></td><td><?= e(ts_date(date('Y-m-d H:i', $d['last']), 'M j, H:i')) ?></td><td><?= e(trim($d['br'] . ' · ' . $d['os'], ' ·')) ?></td></tr>
      <?php endforeach; ?>
    </tbody></table>
    <?php else: ?><p class="muted">Nothing yet.</p><?php endif; ?>
  </section>
  <?php endif; ?>

  <?php if ($r['miss']): ?>
  <section class="a-panel"><h2>Pages that were not found</h2><ul class="a-list"><?= $rows($r['miss'], $r['misses'], null, 8) ?></ul><p class="muted a-foot">Useful for finding broken links, old addresses and probes by scanners.</p></section>
  <?php endif; ?>

  <section class="a-panel">
    <h2>Recent activity</h2>
    <?php if ($r['recent']): ?>
    <div class="a-scroll"><table class="a-table"><thead><tr><th>Time</th><th>What</th><th>Page</th><th>Detail</th><?php if ($ipsOn): ?><th>Address</th><?php endif; ?><th>Browser</th></tr></thead><tbody>
      <?php foreach ($r['recent'] as $x): ?>
      <tr><td><?= e(date('M j, H:i', $x['t'])) ?></td><td><?= e($kinds[$x['k'] ?? 'v'] ?? 'View') ?></td><td><?= e($title((string) $x['p'])) ?></td>
        <td class="a-url"><?= e($short((string) ($x['u'] ?? ($x['r'] ?? '')))) ?></td>
        <?php if ($ipsOn): ?><td class="a-mono"><?= e((string) ($x['ip'] ?? '')) ?></td><?php endif; ?>
        <td><?= e(trim(($x['br'] ?? '') . ' · ' . ($x['os'] ?? ''), ' ·')) ?></td></tr>
      <?php endforeach; ?>
    </tbody></table></div>
    <?php else: ?><p class="muted">No visits recorded in this period.</p><?php endif; ?>
  </section>
  <p class="muted a-note">Records are kept for <?= TSAnalytics::days() ?> days (<?= e(number_format(TSAnalytics::size() / 1024, 0)) ?> KB on disk) and are not part of the backup. Text in click records comes from visitors' browsers, so treat it as unverified.</p>
</main>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<script src="<?= e(ts_file_v('assets/admin/jquery.min.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/namespace.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/themestrap.plugin.dialog.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/prompts.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/analytics.js')) ?>"></script>
