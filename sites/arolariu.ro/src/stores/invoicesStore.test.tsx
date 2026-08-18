import {buildClassification, buildInvoice} from "../../tests/helpers/builders/domain";
import {beforeEach, describe, expect, it} from "vitest";
import {useInvoicesStore} from "./invoicesStore";

describe("useInvoicesStore", () => {
  beforeEach(() => {
    useInvoicesStore.getState().clearEntities();
  });

  it("accepts complete structured invoice DTOs and updates classifications", () => {
    const invoice = buildInvoice();
    const classification = buildClassification({code: "02.1", officialLabel: "Alcoholic beverages"});

    useInvoicesStore.getState().upsertEntity(invoice);
    useInvoicesStore.getState().updateEntity(invoice.id, {classification});

    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.classification).toEqual(classification);
  });
});
