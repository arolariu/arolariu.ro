using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Common.Validators;

[ExcludeFromCodeCoverage]
internal static class Throw<T>
    where T: Exception
{
    public static void IfNull(
        #nullable enable
        object? value,
        string? message = null
        #nullable disable
        )
    {
        if (value is null)
        {
            var exception = (T)Activator.CreateInstance(typeof(T), message);
            throw exception;
        }
    }
}
