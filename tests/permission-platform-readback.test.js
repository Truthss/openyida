'use strict';

const { normalizeListedPackage } = require('../lib/permission/permit-package-service');
const { verifyPackageDimensions } = require('../lib/permission/save-permission');

describe('permission platform list DTO compatibility', () => {
  const raw = {
    packageUuid: 'pkg-platform', packageType: '',
    roleMembers: [{ roleType: 'ROLE', roleValue: [{ key: 'ROLE-EXISTING', label: '角色' }] }],
  };

  test.each(['FORM_PACKAGE_VIEW', 'FORM_PACKAGE_START'])('retains the explicit filtered query type %s for blank DTO types', type => {
    const actual = normalizeListedPackage(raw, type);
    expect(actual.packageType).toBe(type);
    expect(actual.roleData).toEqual({ include: [{ roleType: 'ROLE', roleValue: 'ROLE-EXISTING' }] });
    expect(actual.roleDataComplete).toBe(false);
    expect(raw.packageType).toBe('');
  });

  test('does not relabel an explicit type mismatch or an absent type', () => {
    expect(normalizeListedPackage({ ...raw, packageType: 'FORM_PACKAGE_VIEW' }, 'FORM_PACKAGE_START').packageType).toBe('FORM_PACKAGE_VIEW');
    expect(normalizeListedPackage({ ...raw, packageType: undefined }, 'FORM_PACKAGE_START').packageType).toBeUndefined();
  });

  test('verifies the declared members of a newly created group without assuming existing exclusions are readable', () => {
    const actual = normalizeListedPackage(raw, 'FORM_PACKAGE_VIEW');
    const expected = { packageType: 'FORM_PACKAGE_VIEW', roleData: JSON.stringify({ include: [{ roleType: 'ROLE', roleValue: 'ROLE-EXISTING' }] }) };
    expect(verifyPackageDimensions(null, expected, actual, ['roleData']).mismatches).toEqual([]);
    const wrong = normalizeListedPackage({ ...raw, roleMembers: [{ roleType: 'ROLE', roleValue: [{ key: 'OTHER' }] }] }, 'FORM_PACKAGE_VIEW');
    expect(verifyPackageDimensions(null, expected, wrong, ['roleData']).mismatches).toEqual(expect.arrayContaining([expect.objectContaining({ dimension: 'roleData' })]));
  });

  test('preserves native roleData, including exclusions, without replacing it with display members', () => {
    const roleData = JSON.stringify({ include: [{ roleType: 'ROLE', roleValue: 'ROLE-EXISTING' }], exclude: [{ roleType: 'PERSONS', roleValue: 'excluded-user' }] });
    expect(normalizeListedPackage({ ...raw, roleData }, 'FORM_PACKAGE_VIEW').roleData).toBe(roleData);
  });

  test('does not synthesize incomplete or complex role values', () => {
    const result = normalizeListedPackage({ ...raw, roleMembers: [{ roleType: 'MATRIX', roleValue: [{ key: 'matrix', ext: '{}' }] }] }, 'FORM_PACKAGE_VIEW');
    expect(result.roleData).toBeUndefined();
    expect(result.roleDataComplete).toBe(false);
  });
});
