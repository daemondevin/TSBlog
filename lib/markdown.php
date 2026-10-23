<?php
defined('TS_ROOT') or exit;
// Small, safe Markdown renderer (CommonMark/GFM subset). No dependencies.
// Raw HTML is escaped unless $allowHtml is true.

final class TSMarkdown
{
    private array $stash = [];
    private array $ids = [];
    private array $refs = [];
    private bool $allowHtml;
    private string $alerts;

    // GitHub alert kinds: [!NOTE] and friends. Each maps to a Themestrap PluginAlert type and a title.
    private const ALERTS = [
        'NOTE' => ['info', 'Note'], 'TIP' => ['success', 'Tip'], 'IMPORTANT' => ['primary', 'Important'],
        'WARNING' => ['warning', 'Warning'], 'CAUTION' => ['danger', 'Caution'],
    ];

    // $alerts: 'plugin' writes markup for PluginAlert (the default), 'plain' writes a quote with a bold title (feeds)
    public function __construct(bool $allowHtml = false, string $alerts = 'plugin')
    {
        $this->allowHtml = $allowHtml;
        $this->alerts = $alerts;
    }

    public static function render(string $md, bool $allowHtml = false, string $alerts = 'plugin'): string
    {
        $self = new self($allowHtml, $alerts);
        $md = str_replace(["\r\n", "\r"], "\n", $md);
        $md = str_replace('<!--more-->', '', $md);
        return $self->blocks($self->collectRefs(explode("\n", $md)), false);
    }

    // Reference definitions, [id]: https://example.com "Title", can sit anywhere. They are removed from the text
    // and remembered. Lines inside fenced code are left alone.
    private function collectRefs(array $lines): array
    {
        $out = [];
        $fence = null;
        foreach ($lines as $line) {
            if (preg_match('/^ {0,3}(`{3,}|~{3,})/', $line, $f)) {
                if ($fence === null) $fence = $f[1][0] . strlen($f[1]);
                elseif ($f[1][0] === $fence[0] && strlen($f[1]) >= (int) substr($fence, 1)) $fence = null;
            } elseif ($fence === null && preg_match('/^ {0,3}\[([^\]\^][^\]]*)\]:\s*(?:<([^>\s]*)>|(\S+))(?:\s+(?:"([^"]*)"|\'([^\']*)\'|\(([^)]*)\)))?\s*$/', $line, $m)) {
                $id = self::refKey($m[1]);
                if (!isset($this->refs[$id])) {
                    $url = $m[2] !== '' ? $m[2] : ($m[3] ?? '');
                    $title = ($m[4] ?? '') !== '' ? $m[4] : (($m[5] ?? '') !== '' ? $m[5] : ($m[6] ?? ''));
                    $this->refs[$id] = [$url, $title];
                }
                continue;
            }
            $out[] = $line;
        }
        return $out;
    }

    private static function refKey(string $id): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $id)));
    }

    // Plain-text excerpt: text before <!--more-->, otherwise first paragraph.
    public static function excerpt(string $md, int $max = 200): string
    {
        $md = str_replace(["\r\n", "\r"], "\n", $md);
        $pos = strpos($md, '<!--more-->');
        $chunk = $pos !== false ? substr($md, 0, $pos) : '';
        if ($chunk === '') {
            foreach (preg_split('/\n\s*\n/', $md) as $para) {
                $p = trim($para);
                if ($p !== '' && !preg_match('/^(#{1,6}\s|```|~~~|>|!\[|\||[-*+]\s|\d+[.)]\s)|\n(=+|-+)\s*$/', $p)) { $chunk = $p; break; }
            }
        }
        $chunk = preg_replace('/^ {0,3}\[[^\]^][^\]]*\]:\s.*$/m', '', $chunk);
        $t = preg_replace('/!\[[^\]]*\](\([^)]*\)|\[[^\]]*\])/', '', $chunk);
        $t = preg_replace('/\[([^\]]+)\](\([^)]*\)|\[[^\]]*\])/', '$1', $t);
        $t = preg_replace('/[*_`~>#]+/', '', $t);
        $t = trim(preg_replace('/\s+/', ' ', $t));
        if (mb_strlen($t) > $max) {
            $t = rtrim(mb_substr($t, 0, $max), " .,;:!-") . '…';
        }
        return $t;
    }

    public static function wordCount(string $md): int
    {
        $t = preg_replace('/```.*?```/s', ' ', $md);
        $t = preg_replace('/^ {0,3}\[[^\]^][^\]]*\]:\s.*$/m', ' ', $t);
        $t = preg_replace('/[#>*_`~\[\]()!|-]+/', ' ', $t);
        return (int) preg_match_all('/[\p{L}\p{N}\']+/u', $t);
    }

    // Block level

    private function blocks(array $lines, bool $tight): string
    {
        $out = '';
        $n = count($lines);
        $i = 0;
        while ($i < $n) {
            $line = $lines[$i];
            if (trim($line) === '') { $i++; continue; }

            // fenced code
            if (preg_match('/^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^`]*$/', $line, $m)) {
                $fence = $m[1]; $lang = $m[2]; $code = [];
                $i++;
                while ($i < $n && !preg_match('/^ {0,3}' . preg_quote($fence[0], '/') . '{' . strlen($fence) . ',}\s*$/', $lines[$i])) {
                    $code[] = $lines[$i++];
                }
                $i++;
                $cls = $lang !== '' ? ' class="language-' . htmlspecialchars($lang, ENT_QUOTES) . '"' : '';
                $out .= '<pre><code' . $cls . '>' . htmlspecialchars(implode("\n", $code), ENT_NOQUOTES) . "</code></pre>\n";
                continue;
            }

            // ATX heading
            if (preg_match('/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/', $line, $m)) {
                $out .= $this->heading(strlen($m[1]), $m[2]);
                $i++;
                continue;
            }

            // horizontal rule
            if (preg_match('/^ {0,3}([-*_])( *\1){2,} *$/', $line)) {
                $out .= "<hr>\n";
                $i++;
                continue;
            }

            // blockquote
            if (preg_match('/^ {0,3}>/', $line)) {
                $q = [];
                while ($i < $n && trim($lines[$i]) !== '') {
                    $q[] = preg_replace('/^ {0,3}> ?/', '', $lines[$i]);
                    $i++;
                }
                $alert = $this->alertKind($q);
                if ($alert !== null) {
                    [$type, $title] = self::ALERTS[$alert];
                    $inner = $this->blocks($q, false);
                    if ($this->alerts === 'plain') {
                        $out .= "<blockquote>\n<p><strong>" . $title . "</strong></p>\n" . $inner . "</blockquote>\n";
                    } else {
                        $opt = htmlspecialchars(json_encode(['showIcon' => true, 'title' => $title]), ENT_QUOTES);
                        $out .= '<div class="alert alert-' . ($type === 'primary' ? 'primary' : $type) . '" role="alert" data-plugin-alert data-plugin-options="' . $opt . "\">\n" . $inner . "</div>\n";
                    }
                    continue;
                }
                $out .= "<blockquote>\n" . $this->blocks($q, false) . "</blockquote>\n";
                continue;
            }

            // list
            if (preg_match('/^( {0,3})([-*+]|\d{1,9}[.)])\s+\S/', $line)) {
                [$html, $i] = $this->parseList($lines, $i);
                $out .= $html;
                continue;
            }

            // table
            if (strpos($line, '|') !== false && $i + 1 < $n
                && preg_match('/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/', $lines[$i + 1])
                && strpos($lines[$i + 1], '|') !== false) {
                $head = $this->cells($line);
                $aligns = array_map(function ($c) {
                    $c = trim($c);
                    $l = $c[0] === ':'; $r = substr($c, -1) === ':';
                    return $l && $r ? 'center' : ($r ? 'right' : ($l ? 'left' : ''));
                }, $this->cells($lines[$i + 1]));
                $i += 2;
                $t = "<table>\n<thead><tr>";
                foreach ($head as $k => $h) $t .= $this->cell('th', $h, $aligns[$k] ?? '');
                $t .= "</tr></thead>\n<tbody>\n";
                while ($i < $n && trim($lines[$i]) !== '' && strpos($lines[$i], '|') !== false) {
                    $t .= '<tr>';
                    $row = $this->cells($lines[$i]);
                    foreach ($head as $k => $_) $t .= $this->cell('td', $row[$k] ?? '', $aligns[$k] ?? '');
                    $t .= "</tr>\n";
                    $i++;
                }
                $out .= $t . "</tbody>\n</table>\n";
                continue;
            }

            // raw HTML block
            if ($this->allowHtml && preg_match('/^ {0,3}<(\/?[a-zA-Z][\w-]*|!--)/', $line)) {
                $h = [];
                while ($i < $n && trim($lines[$i]) !== '') $h[] = $lines[$i++];
                $out .= implode("\n", $h) . "\n";
                continue;
            }

            // paragraph, with setext heading support
            $p = [];
            while ($i < $n && trim($lines[$i]) !== '' && ($p === [] || !$this->startsBlock($lines[$i]))) {
                if ($p !== [] && preg_match('/^ {0,3}(=+|-+) *$/', $lines[$i])) {
                    $level = strpos($lines[$i], '=') !== false ? 1 : 2;
                    $out .= $this->heading($level, trim(implode(' ', $p)));
                    $p = [];
                    $i++;
                    continue 2;
                }
                $p[] = $lines[$i++];
            }
            if ($p) {
                $text = $this->inline(trim(implode("\n", $p)));
                $out .= $tight ? $text . "\n" : '<p>' . $text . "</p>\n";
            }
        }
        return $out;
    }

    // A quote whose first line is [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION] (any case) is an alert.
    // The marker line is removed from $q. Returns the kind in capitals, or null.
    private function alertKind(array &$q): ?string
    {
        if (!$q || !preg_match('/^\s*\[!([A-Za-z]+)\]\s*$/', $q[0], $m)) return null;
        $k = strtoupper($m[1]);
        if (!isset(self::ALERTS[$k])) return null;
        array_shift($q);
        return $k;
    }

    private function startsBlock(string $l): bool
    {
        return (bool) preg_match('/^ {0,3}(#{1,6}\s|`{3,}|~{3,}|>|([-*_])( *\2){2,} *$|[-*+]\s+\S|1[.)]\s+\S)/', $l);
    }

    private function heading(int $level, string $text): string
    {
        $plain = trim(strip_tags($this->inline($text)));
        $id = trim(preg_replace('/[^\p{L}\p{N}]+/u', '-', mb_strtolower($plain)), '-');
        $id = $id === '' ? 'section' : $id;
        $base = $id; $k = 2;
        while (isset($this->ids[$id])) $id = $base . '-' . $k++;
        $this->ids[$id] = true;
        return "<h$level id=\"$id\">" . $this->inline($text) . "</h$level>\n";
    }

    private function parseList(array $lines, int $i): array
    {
        $n = count($lines);
        preg_match('/^( *)([-*+]|\d+[.)])\s+/', $lines[$i], $m);
        $base = strlen($m[1]);
        $ordered = ctype_digit($m[2][0]);
        $start = $ordered ? (int) $m[2] : 1;
        $marker = $ordered ? substr($m[2], -1) : $m[2];
        $items = []; $cur = null; $loose = false; $blank = false;

        while ($i < $n) {
            $l = $lines[$i];
            if (trim($l) === '') { $blank = true; if ($cur !== null) $cur[] = ''; $i++; continue; }
            $ind = strlen($l) - strlen(ltrim($l, ' '));
            if (preg_match('/^( *)([-*+]|\d+[.)])\s+(.*)$/', $l, $mm) && strlen($mm[1]) <= $base + 1) {
                $same = ctype_digit($mm[2][0]) === $ordered && ($ordered ? substr($mm[2], -1) : $mm[2]) === $marker;
                if (!$same || strlen($mm[1]) < $base - 1) break;
                if ($cur !== null) { $items[] = $cur; if ($blank) $loose = true; }
                $cur = [$mm[3]];
                $blank = false; $i++;
                continue;
            }
            if ($cur === null) break;
            if ($ind > $base || !$blank) {
                if ($blank) $loose = true;
                $cur[] = preg_replace('/^ {1,' . ($base + 4) . '}/', '', $l, 1);
                $blank = false; $i++;
                continue;
            }
            break;
        }
        if ($cur !== null) $items[] = $cur;

        $tag = $ordered ? 'ol' : 'ul';
        $attr = $ordered && $start !== 1 ? ' start="' . $start . '"' : '';
        $html = "<$tag$attr>\n";
        foreach ($items as $it) {
            while ($it && end($it) === '') array_pop($it);
            $task = '';
            if (preg_match('/^\[([ xX])\]\s+(.*)$/', $it[0], $t)) {
                $task = '<input type="checkbox" disabled' . ($t[1] !== ' ' ? ' checked' : '') . '> ';
                $it[0] = $t[2];
            }
            $inner = rtrim($this->blocks($it, !$loose));
            $html .= '<li' . ($task ? ' class="task"' : '') . '>' . $task . $inner . "</li>\n";
        }
        return [$html . "</$tag>\n", $i];
    }

    private function cells(string $row): array
    {
        $row = trim($row);
        $row = preg_replace('/^\||\|$/', '', $row);
        return array_map('trim', preg_split('/(?<!\\\\)\|/', $row));
    }

    private function cell(string $tag, string $text, string $align): string
    {
        return "<$tag" . ($align ? " style=\"text-align:$align\"" : '') . '>' . $this->inline($text) . "</$tag>";
    }

    // Inline level

    private function hold(string $html): string
    {
        $this->stash[] = $html;
        return "\x01" . (count($this->stash) - 1) . "\x02";
    }

    private function inline(string $t): string
    {
        // code spans
        $t = preg_replace_callback('/(`+)(.+?)(?<!`)\1(?!`)/s', fn($m) =>
            $this->hold('<code>' . htmlspecialchars(trim($m[2]), ENT_NOQUOTES) . '</code>'), $t);
        // backslash escapes
        $t = preg_replace_callback('/\\\\([\\\\`*_{}\[\]()#+\-.!|~<>])/', fn($m) =>
            $this->hold(htmlspecialchars($m[1], ENT_NOQUOTES)), $t);
        // raw inline html
        if ($this->allowHtml) {
            $t = preg_replace_callback('/<\/?[a-zA-Z][^<>]*>|<!--.*?-->/s', fn($m) => $this->hold($m[0]), $t);
        }
        // autolinks <https://...>
        $t = preg_replace_callback('/<(https?:\/\/[^\s<>]+|[^\s@<>]+@[^\s@<>]+\.[a-z]{2,})>/i', function ($m) {
            $u = $m[1];
            $href = strpos($u, '@') !== false && strpos($u, '://') === false ? 'mailto:' . $u : $u;
            return $this->hold('<a href="' . htmlspecialchars($href, ENT_QUOTES) . '">' . htmlspecialchars($u, ENT_NOQUOTES) . '</a>');
        }, $t);
        // reference style images and links: ![alt][id], [text][id], [text][]
        $t = preg_replace_callback('/!\[([^\]]*)\]\[([^\]]*)\]/', function ($m) {
            $r = $this->refs[self::refKey($m[2] !== '' ? $m[2] : $m[1])] ?? null;
            $src = $r ? self::safeUrl($r[0], true) : '';
            if ($src === '') return $m[0];
            $title = $r[1] !== '' ? ' title="' . htmlspecialchars($r[1], ENT_QUOTES) . '"' : '';
            return $this->hold('<img src="' . htmlspecialchars($src, ENT_QUOTES) . '" alt="' . htmlspecialchars($m[1], ENT_QUOTES) . '"' . $title . ' loading="lazy">');
        }, $t);
        $t = preg_replace_callback('/\[((?:[^\[\]]|\[[^\]]*\])+)\]\[([^\]]*)\]/', fn($m) => $this->refLink($m[1], $m[2] !== '' ? $m[2] : $m[1], $m[0]), $t);
        // images
        $t = preg_replace_callback('/!\[([^\]]*)\]\(\s*((?:[^\s()]|\([^\s()]*\))+)(?:\s+"([^"]*)")?\s*\)/', function ($m) {
            $src = self::safeUrl($m[2], true);
            if ($src === '') return $this->hold(htmlspecialchars($m[0], ENT_NOQUOTES));
            $title = ($m[3] ?? '') !== '' ? ' title="' . htmlspecialchars($m[3], ENT_QUOTES) . '"' : '';
            return $this->hold('<img src="' . htmlspecialchars($src, ENT_QUOTES) . '" alt="' . htmlspecialchars($m[1], ENT_QUOTES) . '"' . $title . ' loading="lazy">');
        }, $t);
        // links
        $t = preg_replace_callback('/\[((?:[^\[\]]|\[[^\]]*\])+)\]\(\s*((?:[^\s()]|\([^\s()]*\))+)(?:\s+"([^"]*)")?\s*\)/', function ($m) {
            $href = self::safeUrl($m[2]);
            if ($href === '') return $m[1];
            $rel = preg_match('#^https?://#i', $href) ? ' rel="noopener"' : '';
            $title = ($m[3] ?? '') !== '' ? ' title="' . htmlspecialchars($m[3], ENT_QUOTES) . '"' : '';
            return $this->hold('<a href="' . htmlspecialchars($href, ENT_QUOTES) . '"' . $title . $rel . '>')
                . $this->inline($m[1]) . $this->hold('</a>');
        }, $t);
        // shortcut reference links: [id] when [id]: … is defined somewhere
        if ($this->refs) {
            $t = preg_replace_callback('/(?<![\\\]!])\[([^\[\]]+)\](?![\[(:])/', fn($m) => $this->refLink($m[1], $m[1], $m[0]), $t);
        }
        // bare urls
        $t = preg_replace_callback('/(?<![\w"=\x02])(https?:\/\/[^\s<>\x01]+[^\s<>.,;:!?)\x01])/', fn($m) =>
            $this->hold('<a href="' . htmlspecialchars($m[1], ENT_QUOTES) . '" rel="noopener">' . htmlspecialchars($m[1], ENT_NOQUOTES) . '</a>'), $t);

        $t = htmlspecialchars($t, ENT_NOQUOTES);
        $t = preg_replace('/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/s', '<strong><em>$1</em></strong>', $t);
        $t = preg_replace('/\*\*(?=\S)(.+?)(?<=\S)\*\*|__(?=\S)(.+?)(?<=\S)__/s', '<strong>$1$2</strong>', $t);
        $t = preg_replace('/\*(?=[^\s*])(.+?)(?<=[^\s*])\*|(?<![\w])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![\w])/s', '<em>$1$2</em>', $t);
        $t = preg_replace('/~~(?=\S)(.+?)(?<=\S)~~/s', '<del>$1</del>', $t);
        $t = preg_replace('/(?: {2,}|\\\\)\n/', "<br>\n", $t);

        // restore stash; nested holds resolve over a few passes
        for ($k = 0; $k < 4 && strpos($t, "\x01") !== false; $k++) {
            $t = preg_replace_callback('/\x01(\d+)\x02/', fn($m) => $this->stash[(int) $m[1]], $t);
        }
        return $t;
    }

    private function refLink(string $text, string $id, string $raw): string
    {
        $r = $this->refs[self::refKey($id)] ?? null;
        $href = $r ? self::safeUrl($r[0]) : '';
        if ($href === '') return $raw;
        $rel = preg_match('#^https?://#i', $href) ? ' rel="noopener"' : '';
        $title = $r[1] !== '' ? ' title="' . htmlspecialchars($r[1], ENT_QUOTES) . '"' : '';
        return $this->hold('<a href="' . htmlspecialchars($href, ENT_QUOTES) . '"' . $title . $rel . '>') . $this->inline($text) . $this->hold('</a>');
    }

    public static function safeUrl(string $u, bool $image = false): string
    {
        $u = trim(html_entity_decode($u));
        if ($u === '' || preg_match('/[\x00-\x1f\x7f]/', $u)) return '';
        if (preg_match('/^[a-z][a-z0-9+.\-]*:/i', $u)) {
            $ok = $image ? ['http', 'https'] : ['http', 'https', 'mailto', 'tel'];
            return in_array(strtolower(strstr($u, ':', true)), $ok, true) ? $u : '';
        }
        return $u;
    }
}
