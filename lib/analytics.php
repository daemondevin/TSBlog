<?php
defined('TS_ROOT') or exit;
// Lite analytics. Page views are recorded on the server, link clicks by a tiny script (assets/track.js).
// Everything goes into one guarded log file per month (data/hits-YYYY-MM.php), one JSON object per line:
//   t time, k kind (v view, c click, m not found, b bot), p path, v visitor hash, ip address (per setting),
//   r referrer host, u clicked address, ct click type (out, file, mail), br browser, os system, dv device
// No cookies, no outside service. Nothing is recorded for the signed in author, for bots (they are only counted),
// or for anything when the setting is off.

final class TSAnalytics
{
    public const MAX_FILE = 26214400;   // stop recording into a month file at 25 MB
    private const DOWNLOAD = 'zip|pdf|docx?|xlsx?|pptx?|csv|txt|rar|7z|gz|tgz|dmg|exe|msi|apk|mp3|mp4|mov|epub|iso';

    public static function enabled(): bool { return ts_cfg('analytics', 'off') === 'on'; }

    public static function ipMode(): string
    {
        $m = (string) ts_cfg('analytics_ip', 'full');
        return in_array($m, ['masked', 'none'], true) ? $m : 'full';
    }

    public static function days(): int { return max(7, min(730, (int) ts_cfg('analytics_days', 90))); }

    // Files and secret

    private static function file(string $ym): string { return ts_data_dir() . '/hits-' . $ym . '.php'; }

    private static function files(): array
    {
        $out = [];
        foreach (glob(ts_data_dir() . '/hits-????-??.php') ?: [] as $f) {
            if (preg_match('/hits-(\d{4}-\d{2})\.php$/', $f, $m)) $out[$m[1]] = $f;
        }
        ksort($out);
        return $out;
    }

    public static function size(): int
    {
        $n = 0;
        foreach (self::files() as $f) $n += (int) @filesize($f);
        return $n;
    }

    private static function secret(): string
    {
        $s = (string) (ts_data_read('state')['analytics_secret'] ?? '');
        if ($s === '') { $s = bin2hex(random_bytes(16)); ts_state_set(['analytics_secret' => $s]); }
        return $s;
    }

    // The click script proves it was loaded from this site recently. One value per hour keeps pages cacheable.
    public static function token(): string { return hash_hmac('sha256', 'track|' . intdiv(time(), 3600), self::secret()); }

    private static function tokenOk(string $t): bool
    {
        for ($i = 0; $i <= 48; $i++) if (hash_equals(hash_hmac('sha256', 'track|' . (intdiv(time(), 3600) - $i), self::secret()), $t)) return true;
        return false;
    }

    // Who is asking

    public static function ip(): string
    {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }

    public static function mask(string $ip): string
    {
        if (strpos($ip, ':') === false) return preg_replace('/\.\d+$/', '.0', $ip);
        $bin = @inet_pton($ip);
        if ($bin === false) return '';
        return (string) inet_ntop(substr($bin, 0, 6) . str_repeat("\0", 10));
    }

    public static function agent(string $ua): array
    {
        $bot = preg_match('/bot|crawl|spider|slurp|fetch|monitor|preview|scan|curl|wget|python|java\/|go-http|libwww|headless|lighthouse|feed|rss|facebookexternalhit|embedly|validator|check/i', $ua)
            || $ua === '';
        $br = 'Other';
        foreach (['Edg' => 'Edge', 'OPR' => 'Opera', 'Opera' => 'Opera', 'SamsungBrowser' => 'Samsung', 'Firefox' => 'Firefox', 'FxiOS' => 'Firefox', 'CriOS' => 'Chrome', 'Chrome' => 'Chrome', 'Safari' => 'Safari'] as $needle => $name) {
            if (stripos($ua, $needle) !== false) { $br = $name; break; }
        }
        $os = 'Other';
        foreach (['Windows' => 'Windows', 'Android' => 'Android', 'iPhone' => 'iOS', 'iPad' => 'iOS', 'Mac OS' => 'macOS', 'CrOS' => 'ChromeOS', 'Linux' => 'Linux'] as $needle => $name) {
            if (stripos($ua, $needle) !== false) { $os = $name; break; }
        }
        $dv = preg_match('/iPad|Tablet/i', $ua) ? 'Tablet' : (preg_match('/Mobi|iPhone|Android.+Mobile/i', $ua) ? 'Mobile' : 'Desktop');
        return ['bot' => $bot, 'br' => $br, 'os' => $os, 'dv' => $dv];
    }

    // Is this request one to leave out? The author, non page requests, browser prefetching.
    private static function skip(): bool
    {
        if (!self::enabled() || self::ip() === '') return true;
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return true;
        if (stripos((string) ($_SERVER['HTTP_PURPOSE'] ?? '') . ($_SERVER['HTTP_SEC_PURPOSE'] ?? ''), 'prefetch') !== false) return true;
        return !empty($GLOBALS['ts_admin']) || ts_is_admin();
    }

    // Recording

    private static function write(array $row): void
    {
        $f = self::file(date('Y-m'));
        $new = !is_file($f);
        if (!$new && (int) @filesize($f) > self::MAX_FILE) return;
        $line = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        // One appended line is written in one call under a lock, so visitors at the same time never mix lines
        @file_put_contents($f, ($new ? TS_GUARD : '') . $line, FILE_APPEND | LOCK_EX);
        if ($new) @chmod($f, 0600);
        self::prune();
    }

    private static function base(string $kind, string $path): array
    {
        $ip = self::ip();
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        $a = self::agent($ua);
        $row = ['t' => time(), 'k' => $a['bot'] ? 'b' : $kind, 'p' => mb_substr($path, 0, 160)];
        if ($a['bot']) return $row;
        $mode = self::ipMode();
        $row['v'] = substr(hash_hmac('sha256', ($mode === 'full' ? $ip : self::mask($ip)) . '|' . $ua, self::secret()), 0, 10);
        if ($mode === 'full') $row['ip'] = $ip;
        elseif ($mode === 'masked') $row['ip'] = self::mask($ip);
        $row += ['br' => $a['br'], 'os' => $a['os'], 'dv' => $a['dv']];
        return $row;
    }

    // Called by ts_page() for every page the visitor sees
    public static function view(string $tpl, string $path): void
    {
        if (self::skip() || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') return;
        $row = self::base($tpl === '404' ? 'm' : 'v', $path);
        $ref = (string) parse_url((string) ($_SERVER['HTTP_REFERER'] ?? ''), PHP_URL_HOST);
        $self = (string) parse_url(ts_cfg('url') ?: '', PHP_URL_HOST);
        $ref = preg_replace('/^www\./', '', strtolower($ref));
        if ($ref !== '' && $ref !== preg_replace('/^www\./', '', strtolower($self)) && $ref !== preg_replace('/^www\./', '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')))) {
            $row['r'] = mb_substr($ref, 0, 80);
        }
        self::write($row);
    }

    // Called by the click script
    public static function click(array $in): bool
    {
        if (self::skip() || !self::tokenOk((string) ($in['token'] ?? ''))) return false;
        $u = trim((string) ($in['u'] ?? ''));
        $from = (string) ($in['from'] ?? '/');
        if (strlen($u) > 300 || !preg_match('#^(https?://|mailto:|tel:)#i', $u)) return false;
        $u = preg_replace('/#.*$/', '', $u);
        $t = (string) ($in['t'] ?? 'out');
        $t = in_array($t, ['out', 'file', 'mail'], true) ? $t : 'out';
        // The page the click came from, as a route: drop the blog's folder and the index.php?r= form
        $base = (string) ts_cfg('base');
        if ($base !== '' && strpos($from, $base) === 0) $from = substr($from, strlen($base));
        if (preg_match('#^/index\.php\?(?:.*&)?r=([^&]*)#', $from, $m)) $from = '/' . trim(rawurldecode($m[1]), '/');
        $from = preg_replace('#^/index\.php$#', '/', preg_replace('/\?.*$/', '', $from));
        $row = self::base('c', $from !== '' && $from[0] === '/' ? $from : '/');
        if ($row['k'] === 'b') return true;
        $row['u'] = $u;
        $row['ct'] = $t;
        self::write($row);
        return true;
    }

    public static function isDownload(string $url): bool
    {
        return (bool) preg_match('/\.(' . self::DOWNLOAD . ')$/i', (string) parse_url($url, PHP_URL_PATH));
    }

    // Retention: once a day, drop whole months that are past it and trim the oldest month that is partly past it
    public static function prune(): void
    {
        $state = ts_data_read('state');
        $today = date('Y-m-d');
        if (($state['analytics_pruned'] ?? '') === $today) return;
        ts_state_set(['analytics_pruned' => $today]);
        $cut = time() - self::days() * 86400;
        foreach (self::files() as $ym => $f) {
            $start = strtotime($ym . '-01 00:00:00');
            $end = strtotime('+1 month', $start);
            if ($end <= $cut) { @unlink($f); continue; }
            if ($start >= $cut) continue;
            $keep = [];
            $h = @fopen($f, 'r');
            if (!$h) continue;
            fgets($h);
            while (($line = fgets($h)) !== false) {
                $r = json_decode($line, true);
                if (is_array($r) && ($r['t'] ?? 0) >= $cut) $keep[] = rtrim($line, "\n");
            }
            fclose($h);
            $tmp = $f . '.' . bin2hex(random_bytes(3)) . '.tmp';
            if (@file_put_contents($tmp, TS_GUARD . ($keep ? implode("\n", $keep) . "\n" : ''), LOCK_EX) !== false) { @chmod($tmp, 0600); @rename($tmp, $f) || @unlink($tmp); }
        }
    }

    public static function clear(): void
    {
        foreach (self::files() as $f) @unlink($f);
    }

    // Reading

    // Calls $fn(array $row) for every row from $from to $to (unix times), oldest first
    public static function each(int $from, int $to, callable $fn): void
    {
        $n = 0;
        foreach (self::files() as $ym => $f) {
            $start = strtotime($ym . '-01 00:00:00');
            if (strtotime('+1 month', $start) <= $from || $start > $to) continue;
            $h = @fopen($f, 'r');
            if (!$h) continue;
            fgets($h);
            while (($line = fgets($h)) !== false) {
                $r = json_decode($line, true);
                if (!is_array($r) || !isset($r['t']) || $r['t'] < $from || $r['t'] > $to) continue;
                $fn($r);
                if (++$n >= 1000000) { fclose($h); return; }
            }
            fclose($h);
        }
    }

    public static function report(int $days): array
    {
        $days = max(1, min(730, $days));
        $to = time();
        $today = strtotime('today');
        $fromDay = strtotime('-' . ($days - 1) . ' days', $today);
        $r = ['days' => $days, 'views' => 0, 'clicks' => 0, 'bots' => 0, 'misses' => 0, 'visitors' => [], 'series' => [],
            'pages' => [], 'refs' => [], 'links' => [], 'br' => [], 'os' => [], 'dv' => [], 'ips' => [], 'miss' => [], 'recent' => [],
            'firstDay' => null, 'todayViews' => 0, 'todayVisitors' => []];
        for ($i = 0; $i < $days; $i++) { $d = date('Y-m-d', strtotime('+' . $i . ' days', $fromDay)); $r['series'][$d] = ['views' => 0, 'vis' => [], 'clicks' => 0]; }
        $bump = function (array &$a, string $k, int $n = 1) { $a[$k] = ($a[$k] ?? 0) + $n; };
        $recent = [];
        self::each($fromDay, $to, function ($x) use (&$r, $bump, &$recent, $today) {
            $d = date('Y-m-d', $x['t']);
            $k = $x['k'] ?? 'v';
            if ($k === 'b') { $r['bots']++; return; }
            $v = (string) ($x['v'] ?? '');
            if ($k === 'm') { $r['misses']++; $bump($r['miss'], (string) $x['p']); }
            elseif ($k === 'c') {
                $r['clicks']++;
                $r['series'][$d]['clicks']++;
                $key = (string) ($x['u'] ?? '');
                $r['links'][$key] = $r['links'][$key] ?? ['n' => 0, 'ct' => (string) ($x['ct'] ?? 'out'), 'from' => []];
                $r['links'][$key]['n']++;
                $p = (string) $x['p'];
                $r['links'][$key]['from'][$p] = ($r['links'][$key]['from'][$p] ?? 0) + 1;
            } else {
                $r['views']++;
                $r['series'][$d]['views']++;
                if ($v !== '') { $r['series'][$d]['vis'][$v] = 1; $r['visitors'][$v] = 1; }
                $bump($r['pages'], (string) $x['p']);
                if (!empty($x['r'])) $bump($r['refs'], (string) $x['r']);
                if ($x['t'] >= $today) { $r['todayViews']++; if ($v !== '') $r['todayVisitors'][$v] = 1; }
            }
            if ($k !== 'm') foreach (['br', 'os', 'dv'] as $f) if (!empty($x[$f]) && $k === 'v') $bump($r[$f], (string) $x[$f]);
            if (!empty($x['ip'])) {
                $ip = (string) $x['ip'];
                $r['ips'][$ip] = $r['ips'][$ip] ?? ['n' => 0, 'last' => 0, 'br' => '', 'os' => ''];
                $r['ips'][$ip]['n']++;
                $r['ips'][$ip]['last'] = max($r['ips'][$ip]['last'], $x['t']);
                $r['ips'][$ip]['br'] = (string) ($x['br'] ?? '');
                $r['ips'][$ip]['os'] = (string) ($x['os'] ?? '');
            }
            $recent[] = $x;
            if (count($recent) > 400) array_shift($recent);
        });
        $r['recent'] = array_slice(array_reverse($recent), 0, 60);
        foreach (['pages', 'refs', 'br', 'os', 'dv', 'miss'] as $k) arsort($r[$k]);
        uasort($r['links'], fn($a, $b) => $b['n'] <=> $a['n']);
        uasort($r['ips'], fn($a, $b) => $b['n'] <=> $a['n'] ?: $b['last'] <=> $a['last']);
        foreach ($r['series'] as &$s) $s['vis'] = count($s['vis']);
        unset($s);
        $r['visitorCount'] = count($r['visitors']);
        $r['todayVisitorCount'] = count($r['todayVisitors']);
        unset($r['visitors'], $r['todayVisitors']);
        return $r;
    }

    // CSV of the raw log for a range of days
    public static function csv(int $days): void
    {
        $out = fopen('php://output', 'w');
        fputcsv($out, ['time', 'type', 'path', 'clicked address', 'referrer', 'ip address', 'browser', 'system', 'device'], ',', '"', '');
        $safe = static fn($s) => is_string($s) && $s !== '' && strpos("=+-@\t\r", $s[0]) !== false ? "'" . $s : $s;
        $names = ['v' => 'view', 'c' => 'click', 'm' => 'not found', 'b' => 'bot'];
        self::each(strtotime('-' . max(1, $days) . ' days'), time(), function ($x) use ($out, $safe, $names) {
            fputcsv($out, [date('Y-m-d H:i:s', $x['t']), $names[$x['k'] ?? 'v'] ?? 'view', $safe($x['p'] ?? ''), $safe($x['u'] ?? ''), $safe($x['r'] ?? ''), $x['ip'] ?? '', $x['br'] ?? '', $x['os'] ?? '', $x['dv'] ?? ''], ',', '"', '');
        });
        fclose($out);
    }
}

// The small script that records link clicks, added to every public page when analytics are on
function ts_analytics_tag(): string
{
    if (!TSAnalytics::enabled() || !empty($GLOBALS['ts_admin'])) return '';
    return '<script src="' . e(ts_file_v('assets/track.js')) . '" data-endpoint="' . e(ts_url('track')) . '" data-token="' . e(TSAnalytics::token()) . '" defer></script>';
}
