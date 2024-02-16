import BaseEntity from "./BaseEntity";

export default interface NamedEntity<T> extends BaseEntity<T> {
	name: string;
	description: string;
}
