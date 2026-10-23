<?php
defined('TS_ROOT') or exit;
// Lite comments. One private data file (data/comments.php) holds every comment, whichever way posts are stored.
//
// Modes (setting "comments"): off (nothing shown), moderate (new comments wait for approval), open (shown at once),
// closed (existing comments stay, no new ones). Spam defenses: a form token tied to the post, a hidden trap
// field, a per visitor rate limit, a link limit, and duplicate detection. Commenters never get an account and
// their email address is never shown.

final class TSComments
{
    public const MAX_BODY = 2000;
    public const MAX_LINKS = 2;
    public const STATUSES = ['pending', 'approved', 'spam'];

    private static ?array $memo = null;

    public static function mode(): string
    {
        $m = (string) ts_cfg('comments', 'off');
        return in_array($m, ['moderate', 'open', 'closed'], true) ? $m : 'off';
    }

    public static function enabled(): bool { return self::mode() !== 'off'; }
    public static function accepting(): bool { return in_array(self::mode(), ['moderate', 'open'], true); }

    // Storage

    private static function load(): array
    {
        if (self::$memo !== null) return self::$memo;
        $d = ts_data_read('comments');
        return self::$memo = ['next' => (int) ($d['next'] ?? 1), 'items' => array_values((array) ($d['items'] ?? [])), 'hits' => (array) ($d['hits'] ?? [])];
    }

    // Read, change and write under a lock so two visitors commenting at once do not lose each other's text
    private static function mutate(callable $fn)
    {
        $lock = @fopen(ts_data_dir() . '/comments.lock', 'c');
        if ($lock) @flock($lock, LOCK_EX);
        self::$memo = null;
        $d = self::load();
        $result = $fn($d);
        self::$memo = $d;
        $ok = ts_data_write('comments', $d);
        if ($lock) { @flock($lock, LOCK_UN); fclose($lock); }
        if (!$ok) throw new RuntimeException('The blog could not save the comment because the “data” folder is not writable.');
        return $result;
    }

    public static function all(): array
    {
        $items = self::load()['items'];
        usort($items, fn($a, $b) => strcmp($b['date'], $a['date']) ?: $b['id'] <=> $a['id']);
        return $items;
    }

    public static function counts(): array
    {
        $c = [];
        foreach (self::load()['items'] as $it) if ($it['status'] === 'approved') $c[$it['slug']] = ($c[$it['slug']] ?? 0) + 1;
        return $c;
    }

    public static function count(string $slug): int { return self::counts()[$slug] ?? 0; }

    public static function pending(): int
    {
        $n = 0;
        foreach (self::load()['items'] as $it) if ($it['status'] === 'pending') $n++;
        return $n;
    }

    // Approved comments of a post, oldest first. Replies sit under their parent, one level deep.
    public static function thread(string $slug): array
    {
        $top = [];
        $kids = [];
        $byId = [];
        foreach (self::load()['items'] as $it) {
            if ($it['slug'] !== $slug || $it['status'] !== 'approved') continue;
            $byId[$it['id']] = $it;
        }
        foreach ($byId as $it) {
            $p = (int) ($it['parent'] ?? 0);
            if ($p && isset($byId[$p])) {
                while (!empty($byId[$p]['parent']) && isset($byId[(int) $byId[$p]['parent']])) $p = (int) $byId[$p]['parent'];
                $kids[$p][] = $it;
            } else {
                $top[] = $it;
            }
        }
        foreach ($top as &$t) $t['replies'] = $kids[$t['id']] ?? [];
        unset($t);
        return $top;
    }

    public static function find(int $id): ?array
    {
        foreach (self::load()['items'] as $it) if ($it['id'] === $id) return $it;
        return null;
    }

    // Admin actions

    public static function setStatus(int $id, string $status): bool
    {
        if (!in_array($status, self::STATUSES, true)) return false;
        return (bool) self::mutate(function (&$d) use ($id, $status) {
            foreach ($d['items'] as &$it) if ($it['id'] === $id) { $it['status'] = $status; return true; }
            return false;
        });
    }

    public static function delete(int $id): bool
    {
        return (bool) self::mutate(function (&$d) use ($id) {
            $n = count($d['items']);
            // A reply whose parent is deleted becomes a top level comment
            foreach ($d['items'] as &$it) if (($it['parent'] ?? 0) === $id) $it['parent'] = 0;
            unset($it);
            $d['items'] = array_values(array_filter($d['items'], fn($it) => $it['id'] !== $id));
            return count($d['items']) < $n;
        });
    }

    public static function deleteForSlug(string $slug): void
    {
        self::mutate(function (&$d) use ($slug) { $d['items'] = array_values(array_filter($d['items'], fn($it) => $it['slug'] !== $slug)); });
    }

    public static function renameSlug(string $old, string $new): void
    {
        if ($old === $new) return;
        self::mutate(function (&$d) use ($old, $new) { foreach ($d['items'] as &$it) if ($it['slug'] === $old) $it['slug'] = $new; });
    }

    // Form token: proves the form was loaded from this site recently. Changes once an hour, so pages stay cacheable.
    private static function secret(): string
    {
        $s = (string) (ts_data_read('state')['comment_secret'] ?? '');
        if ($s === '') { $s = bin2hex(random_bytes(16)); ts_state_set(['comment_secret' => $s]); }
        return $s;
    }

    public static function token(string $slug): string
    {
        return hash_hmac('sha256', $slug . '|' . intdiv(time(), 3600), self::secret());
    }

    private static function tokenOk(string $slug, string $t): bool
    {
        for ($i = 0; $i <= 24; $i++) {
            if (hash_equals(hash_hmac('sha256', $slug . '|' . (intdiv(time(), 3600) - $i), self::secret()), $t)) return true;
        }
        return false;
    }

    private static function visitor(): string
    {
        return substr(hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '0'), self::secret()), 0, 16);
    }

    public static function messages(): array
    {
        return [
            'ok' => 'Thanks! Your comment is published.',
            'pending' => 'Thanks! Your comment is waiting for approval and will appear once it has been checked.',
            'name' => 'Please enter your name.',
            'email' => 'That email address does not look right. You can leave it empty.',
            'short' => 'Please write a little more.',
            'long' => 'That comment is too long. The limit is ' . self::MAX_BODY . ' characters.',
            'token' => 'The form expired. Please reload the page and try again.',
            'throttle' => 'You are commenting very quickly. Please wait a few minutes and try again.',
            'closed' => 'Comments are closed.',
            'dupe' => 'You already posted that comment.',
            'save' => 'The comment could not be saved. Please try again later.',
            'post' => 'That post does not exist.',
        ];
    }

    // Validates and stores a comment from a form. Returns ['code' => message key, 'comment' => array|null].
    public static function submit(string $slug, array $in, TSStore $store): array
    {
        if (!self::accepting()) return ['code' => 'closed', 'comment' => null];
        $post = $store->get($slug);
        if (!$post || $post['status'] !== 'published' || $post['type'] !== 'post' || strtotime($post['date']) > time()) return ['code' => 'post', 'comment' => null];
        // The hidden trap field: a person never fills it in. Pretend it worked so bots learn nothing.
        if (trim((string) ($in['website'] ?? '')) !== '') return ['code' => 'pending', 'comment' => null];
        if (!self::tokenOk($slug, (string) ($in['token'] ?? ''))) return ['code' => 'token', 'comment' => null];

        $name = trim(preg_replace('/\s+/', ' ', strip_tags((string) ($in['name'] ?? ''))));
        $email = trim((string) ($in['email'] ?? ''));
        $body = trim(str_replace(["\r\n", "\r"], "\n", (string) ($in['body'] ?? '')));
        $body = preg_replace("/\n{3,}/", "\n\n", $body);
        if ($name === '' || mb_strlen($name) > 60) return ['code' => 'name', 'comment' => null];
        if ($email !== '' && (mb_strlen($email) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL))) return ['code' => 'email', 'comment' => null];
        if (mb_strlen($body) < 2) return ['code' => 'short', 'comment' => null];
        if (mb_strlen($body) > self::MAX_BODY) return ['code' => 'long', 'comment' => null];

        $who = self::visitor();
        $links = preg_match_all('#https?://|www\.#i', $body);
        $status = self::mode() === 'open' && $links <= self::MAX_LINKS ? 'approved' : 'pending';
        $parent = (int) ($in['parent'] ?? 0);

        return self::mutate(function (&$d) use ($slug, $name, $email, $body, $status, $parent, $who) {
            $now = time();
            // At most 5 comments per visitor in 10 minutes and 30 a day
            $hits = array_values(array_filter($d['hits'][$who] ?? [], fn($t) => $t > $now - 86400));
            $recent = count(array_filter($hits, fn($t) => $t > $now - 600));
            if ($recent >= 5 || count($hits) >= 30) return ['code' => 'throttle', 'comment' => null];
            foreach ($d['items'] as $it) if ($it['slug'] === $slug && $it['name'] === $name && $it['body'] === $body) return ['code' => 'dupe', 'comment' => null];
            // Forget visitors with no recent activity so the file stays small
            foreach ($d['hits'] as $k => $v) if (!array_filter($v, fn($t) => $t > $now - 86400)) unset($d['hits'][$k]);
            $hits[] = $now;
            $d['hits'][$who] = $hits;
            if ($parent) {
                $ok = false;
                foreach ($d['items'] as $it) if ($it['id'] === $parent && $it['slug'] === $slug && $it['status'] === 'approved') $ok = true;
                if (!$ok) $parent = 0;
            }
            $c = ['id' => $d['next']++, 'slug' => $slug, 'parent' => $parent, 'name' => $name, 'email' => $email,
                'body' => $body, 'date' => date('Y-m-d H:i'), 'status' => $status];
            $d['items'][] = $c;
            return ['code' => $status === 'approved' ? 'ok' : 'pending', 'comment' => $c];
        });
    }

    // Comment text to HTML: escaped, paragraphs and line breaks, web addresses become links nobody gets ranking from
    public static function html(string $body): string
    {
        $out = [];
        foreach (preg_split("/\n{2,}/", $body) as $para) {
            $t = htmlspecialchars(trim($para), ENT_NOQUOTES, 'UTF-8');
            $t = preg_replace_callback('#\bhttps?://[^\s<]+[^\s<.,;:!?)]#i', fn($m) =>
                '<a href="' . htmlspecialchars(html_entity_decode($m[0]), ENT_QUOTES) . '" rel="nofollow ugc noopener">' . $m[0] . '</a>', $t);
            $out[] = '<p>' . nl2br($t, false) . '</p>';
        }
        return implode("\n", $out);
    }
}

// The comments section of a post: list, then form. Themes style the tsc-* classes. Returns '' when comments are off.
function ts_comments_section(array $post): string
{
    if (!TSComments::enabled() || ($post['type'] ?? 'post') !== 'post') return '';
    $thread = TSComments::thread($post['slug']);
    $total = TSComments::count($post['slug']);
    $msgs = TSComments::messages();
    $flash = (string) ($_GET['c'] ?? '');
    $flashOk = in_array($flash, ['ok', 'pending'], true);
    $reply = (int) ($_GET['reply'] ?? 0);
    $replyTo = $reply ? TSComments::find($reply) : null;
    if ($replyTo && ($replyTo['slug'] !== $post['slug'] || $replyTo['status'] !== 'approved')) $replyTo = null;

    $item = function (array $c, bool $isReply) use (&$item, $post) {
        $initial = mb_strtoupper(mb_substr($c['name'], 0, 1));
        $hue = hexdec(substr(md5(mb_strtolower($c['name'])), 0, 2)) % 6;
        $o = '<li class="tsc-item' . ($isReply ? ' tsc-reply' : '') . '" id="comment-' . (int) $c['id'] . '">'
            . '<span class="tsc-av" data-c="' . $hue . '" aria-hidden="true">' . e($initial) . '</span>'
            . '<div class="tsc-main"><div class="tsc-head"><strong class="tsc-name">' . e($c['name']) . '</strong>'
            . '<time datetime="' . e(date('c', strtotime($c['date']))) . '">' . e(ts_date($c['date'], 'M j, Y')) . '</time></div>'
            . '<div class="tsc-body">' . TSComments::html($c['body']) . '</div>';
        if (TSComments::accepting() && !$isReply) {
            $o .= '<a class="tsc-reply-link" href="' . e(ts_url($post['slug'], ['reply' => $c['id']])) . '#respond" data-reply="' . (int) $c['id'] . '" data-name="' . e($c['name']) . '">Reply</a>';
        }
        $o .= '</div>';
        if (!empty($c['replies'])) {
            $o .= '<ol class="tsc-list tsc-replies">';
            foreach ($c['replies'] as $r) $o .= $item($r, true);
            $o .= '</ol>';
        }
        return $o . '</li>';
    };

    $h = '<section id="comments" class="tsc" aria-labelledby="comments-title"><h2 id="comments-title" class="tsc-title">' . ($total === 1 ? '1 Comment' : $total . ' Comments') . '</h2>';
    $h .= '<div id="comment-flash" class="tsc-flash" role="status" aria-live="polite">';
    if ($flashOk) $h .= '<p class="alert alert-success">' . e($msgs[$flash]) . '</p>';
    elseif ($flash !== '' && isset($msgs[$flash])) $h .= '<p class="alert alert-danger">' . e($msgs[$flash]) . '</p>';
    $h .= '</div>';
    $h .= $thread ? '<ol class="tsc-list">' . implode('', array_map(fn($c) => $item($c, false), $thread)) . '</ol>' : '<p class="tsc-none">No comments yet.' . (TSComments::accepting() ? ' Be the first.' : '') . '</p>';

    if (TSComments::accepting()) {
        $h .= '<form id="respond" class="tsc-form" method="post" action="' . e(ts_url('comment')) . '" data-endpoint="' . e(ts_url('comment')) . '">'
            . '<h3 class="tsc-sub">Leave a comment</h3>'
            . '<p class="tsc-replying"' . ($replyTo ? '' : ' hidden') . '><span>Replying to <strong id="tsc-replying-name">' . e($replyTo['name'] ?? '') . '</strong></span> <a href="' . e(ts_url($post['slug'])) . '#respond" id="tsc-cancel">Cancel</a></p>'
            . '<input type="hidden" name="post" value="' . e($post['slug']) . '">'
            . '<input type="hidden" name="token" value="' . e(TSComments::token($post['slug'])) . '">'
            . '<input type="hidden" name="parent" value="' . (int) ($replyTo['id'] ?? 0) . '">'
            . '<div class="tsc-trap" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>'
            . '<div class="tsc-row"><label class="tsc-field">Name <span class="tsc-req">*</span><input type="text" name="name" maxlength="60" required autocomplete="name"></label>'
            . '<label class="tsc-field">Email <small>(optional, never shown)</small><input type="email" name="email" maxlength="120" autocomplete="email"></label></div>'
            . '<label class="tsc-field">Comment <span class="tsc-req">*</span><textarea name="body" rows="5" maxlength="' . TSComments::MAX_BODY . '" required></textarea></label>'
            . '<p class="tsc-note">' . (TSComments::mode() === 'moderate' ? 'Comments are checked before they appear.' : 'Plain text only. Web addresses become links.') . '</p>'
            . '<button class="tsc-submit" type="submit">Post comment</button></form>';
    } else {
        $h .= '<p class="tsc-closed">Comments are closed.</p>';
    }
    $h .= '</section>';
    return $h;
}
