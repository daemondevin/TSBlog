<?php
defined('TS_ROOT') or exit;
// Fallbacks so the blog still runs on hosts without the mbstring or ctype extensions.

if (!function_exists('mb_internal_encoding')) { function mb_internal_encoding($e = null) { return true; } }
if (!function_exists('mb_strtolower')) { function mb_strtolower($s) { return strtolower((string) $s); } }
if (!function_exists('mb_strlen')) { function mb_strlen($s) { return (int) preg_match_all('/./su', (string) $s); } }
if (!function_exists('mb_strpos')) { function mb_strpos($h, $n, $o = 0) { return strpos($h, $n, $o); } }
if (!function_exists('mb_substr')) {
    function mb_substr($s, $start, $len = null)
    {
        $c = preg_split('//u', (string) $s, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return implode('', array_slice($c, $start, $len));
    }
}
if (!function_exists('ctype_digit')) {
    function ctype_digit($t) { return is_string($t) && $t !== '' && preg_match('/^\d+$/', $t) === 1; }
}
