import {buildClassification, buildMerchant} from "../../tests/helpers/builders/domain";
import {beforeEach, describe, expect, it} from "vitest";
import {useMerchantsStore} from "./merchantsStore";

describe("useMerchantsStore", () => {
  beforeEach(() => {
    useMerchantsStore.getState().clearEntities();
  });

  it("accepts complete structured merchant DTOs and updates classifications", () => {
    const merchant = buildMerchant();
    const classification = buildClassification({code: "G", officialLabel: "Wholesale and retail trade"});

    useMerchantsStore.getState().upsertEntity(merchant);
    useMerchantsStore.getState().updateEntity(merchant.id, {classification});

    expect(useMerchantsStore.getState().getEntityById(merchant.id)?.classification).toEqual(classification);
  });
});
