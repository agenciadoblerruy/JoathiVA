<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/cors_header.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (is_file(__DIR__ . '/db.php')) {
    require_once __DIR__ . '/db.php';
} else {
    require_once __DIR__ . '/config.php';
}
if (is_file(__DIR__ . '/config_email.php')) {
    require_once __DIR__ . '/config_email.php';
}

function jva_cols(PDO $pdo, string $table): array {
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    try {
        $stmt = $pdo->query('DESCRIBE `' . str_replace('`', '``', $table) . '`');
        $cache[$table] = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
    } catch (Throwable $e) {
        $cache[$table] = [];
    }
    return $cache[$table];
}

function jva_has_col(PDO $pdo, string $table, string $col): bool {
    return in_array($col, jva_cols($pdo, $table), true);
}

function jva_json(): array {
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}

function jva_bearer(): ?string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return trim($m[1]);
    }
    return null;
}

function jva_session_payload(array $user, string $token, string $role, string $expiresAt, ?string $providerId = null): array {
    return [
        'ok' => true,
        'token' => $token,
        'role' => $role,
        'user_id' => (string) ($user['id'] ?? ''),
        'username' => (string) ($user['username'] ?? ''),
        'full_name' => (string) ($user['full_name'] ?? $user['username'] ?? ''),
        'provider_id' => $providerId,
        'expires_at' => $expiresAt,
    ];
}

function jva_insert_operator_session(PDO $pdo, array $user, string $token, string $expiresAt): void {
    $cols = jva_cols($pdo, 'operator_sessions');
    if (!$cols) {
        throw new RuntimeException('operator_sessions no existe');
    }
    $fk = in_array('operator_id', $cols, true) ? 'operator_id' : (in_array('broker_id', $cols, true) ? 'broker_id' : null);
    if (!$fk) {
        throw new RuntimeException('operator_sessions no tiene columna FK');
    }
    $fields = ['id', $fk, 'token', 'expires_at'];
    $values = ['id' => 'ops_' . bin2hex(random_bytes(8)), $fk => $user['id'], 'token' => $token, 'expires_at' => $expiresAt];
    if (in_array('device_info', $cols, true)) {
        $fields[] = 'device_info';
        $values['device_info'] = $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
    $sql = 'INSERT INTO operator_sessions (' . implode(', ', $fields) . ') VALUES (:' . implode(',:', $fields) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
}

function jva_delete_operator_sessions(PDO $pdo, string $userId): void {
    // Housekeeping: elimina SOLO las sesiones EXPIRADas de este usuario.
    // Antes borraba todas, lo que pisaba la sesion de otro dispositivo/persona
    // y obligaba a re-login ("andaba intermitente"). Ahora multi-dispositivo.
    try {
        $cols = jva_cols($pdo, 'operator_sessions');
        if (in_array('operator_id', $cols, true)) {
            $pdo->prepare('DELETE FROM operator_sessions WHERE operator_id = ? AND expires_at < NOW()')->execute([$userId]);
        } elseif (in_array('broker_id', $cols, true)) {
            $pdo->prepare('DELETE FROM operator_sessions WHERE broker_id = ? AND expires_at < NOW()')->execute([$userId]);
        }
    } catch (Throwable $e) {
    }
}

function jva_find_operator_by_token(PDO $pdo, string $token): ?array {
    try {
        $stmt = $pdo->prepare('SELECT * FROM operator_sessions WHERE token = ? AND expires_at > NOW() LIMIT 1');
        $stmt->execute([$token]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) {
            return null;
        }
        $fk = null;
        foreach (['operator_id', 'broker_id'] as $col) {
            if (array_key_exists($col, $session) && $session[$col] !== null && $session[$col] !== '') {
                $fk = $session[$col];
                break;
            }
        }
        if (!$fk) {
            return null;
        }
        $stmt = $pdo->prepare("SELECT id, username, full_name, role FROM brokers WHERE id = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$fk]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return null;
        }
        return jva_session_payload($user, $token, (string) ($user['role'] ?? 'operador'), (string) $session['expires_at'], null);
    } catch (Throwable $e) {
        return null;
    }
}

function jva_delete_driver_sessions(PDO $pdo, string $userId): void {
    // Solo sesiones expiradas — permite multi-dispositivo (ver operator).
    try {
        $pdo->prepare('DELETE FROM driver_sessions WHERE driver_id = ? AND expires_at < NOW()')->execute([$userId]);
    } catch (Throwable $e) {
    }
}

function jva_find_driver_by_token(PDO $pdo, string $token): ?array {
    try {
        $stmt = $pdo->prepare('SELECT * FROM driver_sessions WHERE token = ? AND expires_at > NOW() LIMIT 1');
        $stmt->execute([$token]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session || empty($session['driver_id'])) {
            return null;
        }
        $stmt = $pdo->prepare("SELECT id, username, full_name, provider_id FROM driver_accounts WHERE id = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$session['driver_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return null;
        }
        return jva_session_payload($user, $token, 'chofer', (string) $session['expires_at'], $user['provider_id'] ?? null);
    } catch (Throwable $e) {
        return null;
    }
}

function jva_insert_provider_session(PDO $pdo, array $user, string $token, string $expiresAt): void {
    $cols = jva_cols($pdo, 'provider_sessions');
    if (!$cols) {
        throw new RuntimeException('provider_sessions no existe');
    }
    $fields = ['id', 'token', 'expires_at'];
    $values = [
        'id' => 'pvs_' . bin2hex(random_bytes(8)),
        'token' => $token,
        'expires_at' => $expiresAt,
    ];
    if (in_array('user_id', $cols, true)) {
        $fields[] = 'user_id';
        $values['user_id'] = $user['id'];
    }
    if (in_array('provider_id', $cols, true)) {
        $fields[] = 'provider_id';
        $values['provider_id'] = $user['provider_id'] ?? null;
    }
    if (in_array('device_info', $cols, true)) {
        $fields[] = 'device_info';
        $values['device_info'] = $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
    $sql = 'INSERT INTO provider_sessions (' . implode(', ', $fields) . ') VALUES (:' . implode(',:', $fields) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
}

function jva_delete_provider_sessions(PDO $pdo, string $userId): void {
    // Solo sesiones expiradas — permite multi-dispositivo (ver operator).
    try {
        $cols = jva_cols($pdo, 'provider_sessions');
        if (in_array('user_id', $cols, true)) {
            $pdo->prepare('DELETE FROM provider_sessions WHERE user_id = ? AND expires_at < NOW()')->execute([$userId]);
        }
    } catch (Throwable $e) {
    }
}

function jva_find_provider_by_token(PDO $pdo, string $token): ?array {
    try {
        $stmt = $pdo->prepare(
            'SELECT ps.*, pu.username, pu.full_name, pu.role,
                    COALESCE(ps.provider_id, pu.provider_id) AS provider_id,
                    p.name AS provider_name
               FROM provider_sessions ps
               JOIN provider_users pu ON pu.id = ps.user_id
          LEFT JOIN providers p ON p.id = COALESCE(ps.provider_id, pu.provider_id)
              WHERE ps.token = ?
                AND ps.expires_at > NOW()
                AND pu.status = "active"
              LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $payload = jva_session_payload(
            [
                'id' => $row['user_id'] ?? $row['id'] ?? '',
                'username' => $row['username'] ?? '',
                'full_name' => $row['full_name'] ?? $row['username'] ?? '',
            ],
            $token,
            'proveedor',
            (string) $row['expires_at'],
            $row['provider_id'] ?? null
        );
        $payload['provider_name'] = $row['provider_name'] ?? null;
        return $payload;
    } catch (Throwable $e) {
        return null;
    }
}

function jva_insert_customer_session(PDO $pdo, array $user, string $token, string $expiresAt): void {
    $cols = jva_cols($pdo, 'customer_sessions');
    if (!$cols) {
        throw new RuntimeException('customer_sessions no existe');
    }
    $fields = ['id', 'customer_id', 'token', 'expires_at'];
    $values = [
        'id' => 'cus_' . bin2hex(random_bytes(8)),
        'customer_id' => $user['customer_id'] ?? $user['id'],
        'token' => $token,
        'expires_at' => $expiresAt,
    ];
    if (in_array('device_info', $cols, true)) {
        $fields[] = 'device_info';
        $values['device_info'] = $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
    $sql = 'INSERT INTO customer_sessions (' . implode(', ', $fields) . ') VALUES (:' . implode(',:', $fields) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
}

function jva_delete_customer_sessions(PDO $pdo, string $customerId): void {
    // Solo sesiones expiradas — permite multi-dispositivo (ver operator).
    try {
        $pdo->prepare('DELETE FROM customer_sessions WHERE customer_id = ? AND expires_at < NOW()')->execute([$customerId]);
    } catch (Throwable $e) {
    }
}

function jva_find_customer_by_token(PDO $pdo, string $token): ?array {
    try {
        $stmt = $pdo->prepare(
            'SELECT cs.*, ca.id AS account_id, ca.customer_id, ca.username, ca.full_name, c.name AS customer_name
               FROM customer_sessions cs
               JOIN customer_accounts ca ON ca.customer_id = cs.customer_id
          LEFT JOIN customers c ON c.id = ca.customer_id
              WHERE cs.token = ?
                AND cs.expires_at > NOW()
                AND ca.status = "active"
              LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $payload = jva_session_payload(
            [
                'id' => $row['account_id'] ?? $row['customer_id'] ?? '',
                'username' => $row['username'] ?? '',
                'full_name' => $row['full_name'] ?? $row['username'] ?? '',
            ],
            $token,
            'cliente',
            (string) $row['expires_at'],
            null
        );
        $payload['customer_id'] = $row['customer_id'] ?? null;
        $payload['customer_name'] = $row['customer_name'] ?? null;
        return $payload;
    } catch (Throwable $e) {
        return null;
    }
}

function jva_delete_session_token(PDO $pdo, string $token): void {
    try {
        $pdo->prepare('DELETE FROM operator_sessions WHERE token = ?')->execute([$token]);
    } catch (Throwable $e) {
    }
    try {
        $pdo->prepare('DELETE FROM driver_sessions WHERE token = ?')->execute([$token]);
    } catch (Throwable $e) {
    }
    try {
        $pdo->prepare('DELETE FROM provider_sessions WHERE token = ?')->execute([$token]);
    } catch (Throwable $e) {
    }
    try {
        $pdo->prepare('DELETE FROM customer_sessions WHERE token = ?')->execute([$token]);
    } catch (Throwable $e) {
    }
}

function jva_issue_operator_token(PDO $pdo, array $user): array {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    jva_delete_operator_sessions($pdo, (string) $user['id']);
    jva_insert_operator_session($pdo, $user, $token, $expiresAt);
    return jva_session_payload($user, $token, (string) ($user['role'] ?? 'operador'), $expiresAt, null);
}

function jva_issue_driver_token(PDO $pdo, array $user): array {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    jva_delete_driver_sessions($pdo, (string) $user['id']);
    $stmt = $pdo->prepare(
        'INSERT INTO driver_sessions (id, driver_id, token, device_info, expires_at)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        'ses_' . bin2hex(random_bytes(8)),
        $user['id'],
        $token,
        $_SERVER['HTTP_USER_AGENT'] ?? null,
        $expiresAt,
    ]);
    return jva_session_payload($user, $token, 'chofer', $expiresAt, $user['provider_id'] ?? null);
}

function jva_issue_provider_token(PDO $pdo, array $user): array {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    jva_delete_provider_sessions($pdo, (string) $user['id']);
    jva_insert_provider_session($pdo, $user, $token, $expiresAt);
    return jva_session_payload($user, $token, 'proveedor', $expiresAt, $user['provider_id'] ?? null);
}

function jva_issue_customer_token(PDO $pdo, array $user): array {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    jva_delete_customer_sessions($pdo, (string) ($user['customer_id'] ?? $user['id']));
    jva_insert_customer_session($pdo, $user, $token, $expiresAt);
    $payload = jva_session_payload($user, $token, 'cliente', $expiresAt, null);
    $payload['customer_id'] = $user['customer_id'] ?? null;
    return $payload;
}

try {
    $pdo = getDB();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $token = jva_bearer();
        if (!$token) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Token no proporcionado'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        $session = jva_find_operator_by_token($pdo, $token)
            ?: jva_find_provider_by_token($pdo, $token)
            ?: jva_find_customer_by_token($pdo, $token)
            ?: jva_find_driver_by_token($pdo, $token);
        if (!$session) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Sesion invalida o expirada'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        echo json_encode($session, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method === 'POST') {
        $body = jva_json();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            echo json_encode(['ok' => false, 'error' => 'Usuario y contrasena requeridos'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        $opStmt = $pdo->prepare(
            "SELECT id, username, password_hash, full_name, role
               FROM brokers
              WHERE (username = ? OR email = ?) AND status = 'active'
              LIMIT 1"
        );
        $opStmt->execute([$username, $username]);
        $op = $opStmt->fetch(PDO::FETCH_ASSOC);

        // ── Login por correo (multi-usuario) ──────────────────────────
        // Acepta a cualquiera de las cuentas definidas en EMAIL_ACCOUNTS
        // (rhernandez, gimena, valeria...) con la clave de SU propio correo.
        // Retrocompatible: si no hay EMAIL_ACCOUNTS, cae al par EMAIL_USER/EMAIL_PASS.
        $emailLoginOk = false;
        $emailAccount = null;   // datos de la cuenta que coincidio (nombre, rol)

        $jvaAccounts = [];
        if (defined('EMAIL_ACCOUNTS_JSON')) {
            $decoded = json_decode((string) EMAIL_ACCOUNTS_JSON, true);
            if (is_array($decoded)) $jvaAccounts = $decoded;
        }
        // Fallback al par unico historico si no se definio el arreglo
        if (!$jvaAccounts && defined('EMAIL_USER') && defined('EMAIL_PASS')) {
            $jvaAccounts = [ (string) EMAIL_USER => ['pass' => (string) EMAIL_PASS, 'role' => 'operador', 'nombre' => (string) EMAIL_USER] ];
        }

        foreach ($jvaAccounts as $acctUser => $acctData) {
            $acctPass  = (string) ($acctData['pass']  ?? '');
            $acctEmail = (string) ($acctData['email'] ?? '');
            if ($acctPass === '') continue;  // cuenta sin clave configurada: se ignora
            // Acepta login con username O con el email asociado a la cuenta
            $matchUser  = hash_equals((string) $acctUser, $username);
            $matchEmail = $acctEmail !== '' && hash_equals($acctEmail, $username);
            if (($matchUser || $matchEmail) && hash_equals($acctPass, $password)) {
                $emailLoginOk = true;
                $emailAccount = [
                    'username' => (string) $acctUser,
                    'role'     => (string) ($acctData['role']   ?? 'operador'),
                    'nombre'   => (string) ($acctData['nombre'] ?? $acctUser),
                ];
                break;
            }
        }

        // Si la cuenta de correo coincidio pero no hay un broker con ese
        // username exacto, buscamos un broker de respaldo para colgar la sesion.
        // Preferimos uno cuyo role coincida con el de la cuenta; si no, el primer
        // operador/admin activo.
        if (!$op && $emailLoginOk) {
            $wantRole = $emailAccount['role'] ?? 'operador';
            $fallback = $pdo->prepare(
                "SELECT id, username, password_hash, full_name, role
                   FROM brokers
                  WHERE status = 'active' AND role = ?
                  ORDER BY id ASC
                  LIMIT 1"
            );
            $fallback->execute([$wantRole]);
            $op = $fallback->fetch(PDO::FETCH_ASSOC) ?: null;

            // Segundo intento: cualquier operador/admin activo (historico)
            if (!$op) {
                $fb2 = $pdo->prepare(
                    "SELECT id, username, password_hash, full_name, role
                       FROM brokers
                      WHERE status = 'active' AND role IN ('operador','admin')
                      ORDER BY id ASC
                      LIMIT 1"
                );
                $fb2->execute();
                $op = $fb2->fetch(PDO::FETCH_ASSOC) ?: null;
            }
        }

        if ($op && (password_verify($password, (string) $op['password_hash']) || $emailLoginOk)) {
            // Cuando el login fue por correo, usamos el username/nombre/rol de la
            // cuenta que coincidio (gimena, valeria, rhernandez...), no el del
            // broker de respaldo.
            echo json_encode(jva_issue_operator_token($pdo, [
                'id' => $op['id'],
                'username' => $emailLoginOk && $emailAccount
                    ? $emailAccount['username']
                    : (string) $op['username'],
                'full_name' => $emailLoginOk && $emailAccount
                    ? $emailAccount['nombre']
                    : ($op['full_name'] ?? $op['username']),
                'role' => $emailLoginOk && $emailAccount
                    ? $emailAccount['role']
                    : ($op['role'] ?? 'operador'),
            ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        $provider = null;
        try {
            $provStmt = $pdo->prepare(
                "SELECT pu.id, pu.username, pu.password_hash, pu.full_name, pu.provider_id, pu.role
                   FROM provider_users pu
                   JOIN providers p ON p.id = pu.provider_id
                  WHERE pu.username = ? AND pu.status = 'active' AND p.status = 'active'
                  LIMIT 1"
            );
            $provStmt->execute([$username]);
            $provider = $provStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Throwable $e) {
        }

        if ($provider && password_verify($password, (string) $provider['password_hash'])) {
            echo json_encode(jva_issue_provider_token($pdo, [
                'id' => $provider['id'],
                'username' => $provider['username'],
                'full_name' => $provider['full_name'] ?? $provider['username'],
                'provider_id' => $provider['provider_id'],
                'role' => 'proveedor',
            ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        $customer = null;
        try {
            $customerStmt = $pdo->prepare(
                "SELECT ca.id, ca.customer_id, ca.username, ca.password_hash, ca.full_name
                   FROM customer_accounts ca
                   JOIN customers c ON c.id = ca.customer_id
                  WHERE ca.username = ? AND ca.status = 'active' AND c.status = 'active'
                  LIMIT 1"
            );
            $customerStmt->execute([$username]);
            $customer = $customerStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Throwable $e) {
        }

        if ($customer && password_verify($password, (string) $customer['password_hash'])) {
            echo json_encode(jva_issue_customer_token($pdo, [
                'id' => $customer['id'],
                'customer_id' => $customer['customer_id'],
                'username' => $customer['username'],
                'full_name' => $customer['full_name'] ?? $customer['username'],
                'role' => 'cliente',
            ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        $driver = null;
        try {
            $drvStmt = $pdo->prepare(
                "SELECT id, username, password_hash, full_name, provider_id
                   FROM driver_accounts
                  WHERE username = ? AND status = 'active'
                  LIMIT 1"
            );
            $drvStmt->execute([$username]);
            $driver = $drvStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Throwable $e) {
        }

        if ($driver && password_verify($password, (string) $driver['password_hash'])) {
            echo json_encode(jva_issue_driver_token($pdo, [
                'id' => $driver['id'],
                'username' => $driver['username'],
                'full_name' => $driver['full_name'] ?? $driver['username'],
                'provider_id' => $driver['provider_id'] ?? null,
            ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Usuario o contrasena incorrectos'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($method === 'DELETE') {
        $token = jva_bearer();
        if ($token) {
            jva_delete_session_token($pdo, $token);
        }
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo no permitido'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
