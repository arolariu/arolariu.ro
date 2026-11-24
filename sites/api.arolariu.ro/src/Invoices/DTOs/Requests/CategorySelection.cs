namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;

internal static class CategorySelection
{
  private const int Clear = -1;

  internal static bool IsValid<TCategory>(int? selection) where TCategory : struct, Enum =>
    selection is null or Clear || Enum.IsDefined(typeof(TCategory), selection.Value);

  internal static TCategory? Apply<TCategory>(int? selection, TCategory? current) where TCategory : struct, Enum =>
    selection switch
    {
      null => current,
      Clear => null,
      int id => (TCategory)Enum.ToObject(typeof(TCategory), id),
    };
}
