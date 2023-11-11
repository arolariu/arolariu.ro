using System;
using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Common.Validators;

[ExcludeFromCodeCoverage]
public static class Validator
{
    /// <summary>
    /// Validates a class object.
    /// </summary>
    /// <typeparam name="TObject"></typeparam>
    /// <param name="object"></param>
    /// <param name="predicate"></param>
    /// <example>
    /// Validator.ValidateClassObject(object, object => object is not null);
    /// </example>
    /// <returns></returns>
    private static void ValidateClassObjectAndThrow<TObject, TException>(
        TObject? @object,
        Func<TObject?, bool> predicate,
        string message)
        where TException : Exception, new()
    {
        var meetsCriteria = @object is not null && predicate(@object);
        if (!meetsCriteria)
        {
            var exception = Activator.CreateInstance(typeof(TException), message);
            throw (TException)exception!;
        }
    }

    /// <summary>
    /// Validates a struct object.
    /// </summary>
    /// <typeparam name="TObject"></typeparam>
    /// <param name="object"></param>
    /// <param name="predicate"></param>
    /// <example>
    /// Validator.ValidateStructObject(object, object => object is not null);
    /// </example>
    /// <returns></returns>
    private static void ValidateStructObjectAndThrow<TObject, TException>(
        TObject? @object,
        Func<TObject?, bool> predicate,
        string message)
        where TException : Exception, new()
    {
        var meetsCriteria = @object is not null && predicate(@object);
        if (!meetsCriteria)
        {
            var exception = Activator.CreateInstance(typeof(TException), message);
            throw (TException)exception!;
        }
    }

    public static void ValidateAndThrow<TObject, TException>(
        TObject? @object,
        Func<TObject?, bool> predicate,
        string message)
        where TException : Exception, new()
    {
        var type = typeof(TObject);

        if (type.IsClass)
        {
            ValidateClassObjectAndThrow<TObject, TException>(@object, predicate, message);
        }
        else if (type.IsValueType)
        {
            ValidateStructObjectAndThrow<TObject, TException>(@object, predicate, message);
        }
    }
}
