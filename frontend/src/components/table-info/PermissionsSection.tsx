import { useMemo, useState } from 'react';
import { Shield, Settings2, Save, X } from 'lucide-react';
import { RoleInfo, TableGrant } from '../../types';
import { useRoles, useSetPermissions } from '../../hooks/useDatabase';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { useToast } from '../../context/ToastContext';

interface PermissionsSectionProps {
  connectionId: string | undefined;
  schema: string;
  table: string;
  grants: TableGrant[];
  loading?: boolean;
  error?: string | null;
}

const PRIV_OPTIONS = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
] as const;

type Privilege = (typeof PRIV_OPTIONS)[number];

function roleLabel(r: RoleInfo) {
  return r.can_login ? `${r.name} (user)` : r.name;
}

export default function PermissionsSection({
  connectionId,
  schema,
  table,
  grants,
  loading,
  error,
}: PermissionsSectionProps) {
  const { showToast } = useToast();
  const rolesQuery = useRoles(connectionId);
  const setPermissions = useSetPermissions(connectionId);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPrivileges, setSelectedPrivileges] = useState<Set<Privilege>>(new Set());
  const [grantOption, setGrantOption] = useState(false);

  const openManage = (role?: string) => {
    const r = role ?? '';
    setSelectedRole(r);

    const roleGrants = grants.filter((g) => g.grantee === r);
    const privs = new Set<Privilege>();
    for (const g of roleGrants) {
      const p = String(g.privilege).toUpperCase() as Privilege;
      if ((PRIV_OPTIONS as readonly string[]).includes(p)) privs.add(p);
    }
    setSelectedPrivileges(privs);
    setGrantOption(roleGrants.some((g) => g.is_grantable));
    setManageOpen(true);
  };

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { grantee: string; grantor?: string | null; isGrantable: boolean; privileges: Set<string> }
    >();
    for (const g of grants) {
      const key = `${g.grantee}|${g.grantor ?? ''}`;
      const existing =
        map.get(key) ??
        { grantee: g.grantee, grantor: g.grantor, isGrantable: false, privileges: new Set<string>() };
      existing.privileges.add(g.privilege);
      existing.isGrantable = existing.isGrantable || !!g.is_grantable;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.grantee.localeCompare(b.grantee));
  }, [grants]);

  const roles = rolesQuery.data ?? [];
  const roleOptions = useMemo(
    () => [
      { value: '', label: 'Select role…' },
      ...roles.map((r) => ({ value: r.name, label: roleLabel(r) })),
    ],
    [roles],
  );

  const busy = !!loading || setPermissions.isPending;

  const save = async () => {
    if (!selectedRole) {
      showToast('Select a role first', 'error');
      return;
    }
    try {
      await setPermissions.mutateAsync({
        schema,
        table,
        grantee: selectedRole,
        privileges: Array.from(selectedPrivileges),
        grant_option: grantOption,
      });
      showToast('Permissions updated', 'success');
      setManageOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update permissions';
      showToast(String(msg), 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
          <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
            Permissions {grants.length ? `(${grants.length})` : ''}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="text-[10px] text-text-secondary">Loading…</div>}
          <button
            type="button"
            onClick={() => openManage()}
            disabled={!connectionId || busy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
            title="Manage permissions"
          >
            <Settings2 size={12} />
            Manage
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-xs text-error bg-bg-0 border border-border rounded p-3">
          {error}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-text-secondary bg-bg-0 border border-border rounded p-3">
          No permissions found (or not supported for this database).
        </div>
      ) : (
        <div className="overflow-auto border border-border rounded bg-bg-0">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-bg-1 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-text-secondary font-semibold">Role</th>
                <th className="px-3 py-2 text-text-secondary font-semibold">Privileges</th>
                <th className="px-3 py-2 text-text-secondary font-semibold">Granted by</th>
                <th className="px-3 py-2 text-text-secondary font-semibold">Grantable</th>
                <th className="px-3 py-2 text-text-secondary font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={`${g.grantee}|${g.grantor ?? ''}`} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary font-mono">{g.grantee}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(g.privileges)
                        .sort()
                        .map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-2 py-0.5 rounded border border-border bg-bg-2 text-text-secondary"
                          >
                            {p}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-text-secondary font-mono">{g.grantor ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        g.isGrantable ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-border bg-bg-2 text-text-secondary'
                      }`}
                    >
                      {g.isGrantable ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openManage(g.grantee)}
                      disabled={!connectionId || busy}
                      className="px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage Permissions"
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-2 rounded transition-colors"
              disabled={setPermissions.isPending}
            >
              <span className="inline-flex items-center gap-2">
                <X size={16} />
                Cancel
              </span>
            </button>
            <button
              type="button"
              onClick={save}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={setPermissions.isPending}
            >
              <span className="inline-flex items-center gap-2">
                <Save size={16} />
                Save
              </span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
            <Select
              value={selectedRole}
              onChange={(val) => {
                setSelectedRole(val);
                const roleGrants = grants.filter((g) => g.grantee === val);
                const privs = new Set<Privilege>();
                for (const g of roleGrants) {
                  const p = String(g.privilege).toUpperCase() as Privilege;
                  if ((PRIV_OPTIONS as readonly string[]).includes(p)) privs.add(p);
                }
                setSelectedPrivileges(privs);
                setGrantOption(roleGrants.some((g) => g.is_grantable));
              }}
              options={roleOptions}
              searchable
            />
            {rolesQuery.isLoading && (
              <div className="text-xs text-text-secondary mt-1">Loading roles…</div>
            )}
            {rolesQuery.error && (
              <div className="text-xs text-error mt-1">
                {String((rolesQuery.error as any)?.response?.data?.error || (rolesQuery.error as any)?.message || 'Failed to load roles')}
              </div>
            )}
          </div>

          <div className="p-3 rounded border border-border bg-bg-0">
            <div className="text-xs font-medium text-text-secondary mb-2">Privileges</div>
            <div className="flex flex-wrap gap-2">
              {PRIV_OPTIONS.map((p) => {
                const checked = selectedPrivileges.has(p);
                return (
                  <label
                    key={p}
                    className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs cursor-pointer ${
                      checked ? 'border-accent bg-accent/10 text-text-primary' : 'border-border bg-bg-2 text-text-secondary'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onChange={(checked) => {
                        setSelectedPrivileges((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(p);
                          else next.delete(p);
                          return next;
                        });
                      }}
                    />
                    {p}
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-text-secondary">WITH GRANT OPTION</div>
              <button
                type="button"
                onClick={() => setGrantOption((v) => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  grantOption ? 'bg-accent' : 'bg-bg-3'
                }`}
              >
                <div
                  className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${
                    grantOption ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-text-secondary">
            Note: saving will overwrite explicit grants for this role on the table (it revokes all, then re-grants selected privileges).
          </div>
        </div>
      </Modal>
    </div>
  );
}
